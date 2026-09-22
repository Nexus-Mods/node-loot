const crypto = require('crypto');
const net = require('net');
const os = require('os');
const path = require('path');
const { StringDecoder } = require('string_decoder');

const { Loot, IsCompatible, SetLogLevel } = require('./build/Release/node-loot');

const LogLevel = {
  trace: 0,
  debug: 1,
  info: 2,
  warning: 3,
  error: 4,
};

// the endpoint the worker connects to: a named pipe on Windows, elsewhere a unix socket in the
// user's runtime directory, which the desktop spec keeps private, or the temp directory without one
function ipcPath() {
  const id = crypto.randomUUID();
  if (process.platform === 'win32') {
    return `\\\\?\\pipe\\loot-ipc-${id}`;
  }
  return path.join(process.env.XDG_RUNTIME_DIR ?? os.tmpdir(), `loot-ipc-${id}.sock`);
}

// interface IPluginsNotLoadedArgs {
//   name: string;
//   plugin: string;
//   func: string;
//   currentlyLoaded: string[];
// }
class PluginNotLoaded extends Error {
  constructor(args) {
    super(`Plugin not loaded: "${args.plugin}"; currently loaded: ${args.currentlyLoaded.join(', ')}`);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.plugin = args.plugin;
    this.func = args.func;
    this.currentlyLoaded = args.currentlyLoaded || [];
  }
}

class AlreadyClosed extends Error {
  constructor() {
    super('Already closed');
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
  }
}

class RemoteDied extends Error {
  constructor(call, code) {
    super('LOOT process died');
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.call = call;
    // the socket error that ended it, where one was reported before it closed
    this.code = code;
  }
}

// the worker answered with something that is not a message
class InvalidResponse extends Error {
  constructor(call, frameBytes, detail) {
    super(`Invalid response to "${call}": ${detail}`);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.call = call;
    this.frameBytes = frameBytes;
  }
}

class LootAsync {
  static create(gameId, gamePath, gameLocalPath, language, logCallback, onFork, callback) {
    try {
      const res = new LootAsync(gameId, gamePath, gameLocalPath, language, logCallback, onFork, (err) => {
        if (err !== null) {
          callback(err);
        } else {
          callback(null, res);
        }
      });
    } catch (err) {
      callback(err);
    }
  }

  constructor(gameId, gamePath, gameLocalPath, language, logCallback, onFork, callback) {
    this.queue = [];
    this.logCallback = logCallback;
    this.didClose = false;
    this.dataBuffer = '';
    // the call the worker is answering, named on the errors that end it
    this.currentCall = undefined;
    // the code of the socket error that closed the pipe, if one was reported
    this.socketErrorCode = undefined;
    // a read can end mid-character; the decoder holds the incomplete sequence back until the
    // rest arrives
    this.decoder = new StringDecoder('utf8');
    if (onFork !== undefined) {
      this.onFork = onFork;
    } else {
      const cp = require('child_process');
      this.onFork = (script, args) => {
        cp.spawn(process.execPath, [
          script,
          ...args,
        ]);
      }
    }
    this.initArgs = [
      gameId,
      gamePath,
      gameLocalPath,
      language,
    ];

    let initCallback = (err) => {
      // ensure the init callback isn't called twice.
      initCallback = (err) => {
        logCallback(4, err.message);
      }
      callback(err);
    }

    this.makeProxy('updateFile');
    this.makeProxy('getMasterlistRevision');
    this.makeProxy('loadLists');
    this.makeProxy('loadPlugins');
    this.makeProxy('getPlugin');
    this.makeProxy('getPluginMetadata');
    this.makeProxy('sortPlugins');
    this.makeProxy('setLoadOrder');
    this.makeProxy('getLoadOrder');
    this.makeProxy('loadCurrentLoadOrderState');
    this.makeProxy('isPluginActive');
    this.makeProxy('getGroups');
    this.makeProxy('getGroupsPath');
    this.makeProxy('getUserGroups');
    this.makeProxy('setUserGroups');
    this.makeProxy('getGeneralMessages');
    this.makeProxy('clearConditionCache');
    this.makeProxy('setLogLevel');

    this.ipcPath = ipcPath();
    this.ipc = new net.Server();
    try {
      // this seems to fail for some users with EINVAL. why?
      // May be a wine-only problem but that's not confirmed
      this.ipc.listen(this.ipcPath, () => {
        this.ipc.on('connection', socket => {
          this.socket = socket;
          socket
          .on('data', data => {
            try {
              this.dataBuffer += this.decoder.write(data);
              const messages = this.dataBuffer.split('\uFFFF');
              // Keep incomplete chunk (last element after split if no trailing delimiter)
              if (!this.dataBuffer.endsWith('\uFFFF')) {
                this.dataBuffer = messages.pop();
              } else {
                this.dataBuffer = '';
              }
              // the call a frame in this read may still answer, and the first frame that was no
              // answer at all
              const answering = this.currentCallback;
              let unreadable;
              for (const msg of messages) {
                if (msg.length === 0) {
                  continue;
                }
                let response;
                try {
                  response = JSON.parse(msg);
                } catch (err) {
                  unreadable ??= new InvalidResponse(this.currentCall, msg.length, err.message);
                  continue;
                }
                this.handleResponse(response);
              }
              // a log frame can be the unreadable one, so the call only fails if nothing in the
              // read answered it
              if (unreadable !== undefined && this.currentCallback === answering) {
                this.failCurrent(unreadable);
              }
            } catch (err) {
              this.logCallback(4, err.message);
            }
          })
          .on('error', err => {
            // a socket error closes the socket, so the calls waiting on it are failed by the
            // close handler; this keeps the reason to tell them why
            this.socketErrorCode = err.code;
            this.logCallback(4, err.message);
          })
          .on('close', () => {
            // nothing more is coming from the child, so every call waiting on it fails here
            const pending = [
              { call: this.currentCall, callback: this.currentCallback },
              ...this.queue.map((entry) => ({ call: entry.message.type, callback: entry.callback })),
            ];
            this.queue = [];
            this.currentCallback = undefined;
            this.currentCall = undefined;
            for (const { call, callback } of pending) {
              if (callback !== undefined) {
                callback(new RemoteDied(call, this.socketErrorCode));
              }
            }
          });
        })

        this.restart(initCallback);
      })
      .on('error', (err) => {
        initCallback(err);
      });
    } catch (err) {
      initCallback(new Error('failed to establish IPC endpoint'));
    }
  }

  restart(callback) {
    this.worker = this.onFork(`${__dirname}${path.sep}async.js`, [this.ipcPath]);
    this.currentCallback = () => {
      this.enqueue({
        type: 'init',
        args: this.initArgs,
      }, callback);
    }
  }

  close() {
    if (this.didClose) {
      return;
    }

    this.enqueue({ type: 'terminate' }, () => {
      this.worker = undefined;
      // closing the server removes a unix socket's file
      this.ipc.close();
    });
    this.didClose = true;
  }

  isClosed() {
    return this.didClose;
  }

  makeProxy(name) {
    this[name] = (...args) => {
      let cb = args[args.length - 1];
      if (typeof(cb) !== 'function') {
        cb = undefined;
      } else {
        args = args.slice(0, args.length - 1);
      }

      this.enqueue({
        type: name,
        args,
      }, cb);
    };
  }

  enqueue(message, callback) {
    if (this.didClose) {
      return callback(new AlreadyClosed());
    }
    if (!this.currentCallback) {
      this.deliver(message, callback);
    } else {
      this.queue.push({ message, callback });
    }
  }

  // fail the call being answered and move on to the next one
  failCurrent(err) {
    const callback = this.currentCallback;
    this.currentCallback = undefined;
    this.currentCall = undefined;
    this.processQueue();
    if (callback !== undefined) {
      callback(err);
    }
  }

  deliver(message, callback) {
    this.currentCallback = callback;
    this.currentCall = message.type;
    const handleError = err => {
      if (!!err) {
        this.failCurrent(err.code === 'EPIPE' ? new RemoteDied(this.currentCall) : err);
      }
    };
    try {
      this.socket.write(JSON.stringify(message) + '\uFFFF', handleError);
    } catch (err) {
      handleError(err);
    }
  }

  processQueue() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.deliver(next.message, next.callback);
    } else {
      this.currentCallback = undefined;
    }
  }

  handleResponse(msg) {
    // don't touch the queue when relaying logs
    if (msg.log) {
      this.logCallback(msg.log.level, msg.log.message);
      return;
    }

    // relay result, then process next request in the queue, if any
    try {
      if (!!this.currentCallback) {
        if (msg.error) {
          const extraArgs = JSON.parse(msg.extraArgs);
          let err;
          if (extraArgs.name === 'AlreadyClosed') {
            err = new AlreadyClosed();
          } else if (extraArgs.name === 'PluginNotLoaded') {
            err = new PluginNotLoaded(extraArgs);
          } else {
            err = new Error(msg.error);
          }
          Object.assign(err, extraArgs);
          this.currentCallback(err);
        } else {
          this.currentCallback(null, msg.result);
        }
      }
      this.processQueue();
    } catch (err) {
      // don't want to suppress an error but
      // if we don't trigger the queue here, this proxy is dead
      this.processQueue();
      throw err;
    }
  }
}

module.exports = {
  AlreadyClosed,
  LogLevel,
  Loot,
  LootAsync,
  IsCompatible,
  SetLogLevel,
};
