net = require('net');
const path = require('path');

const { Loot, IsCompatible } = require('./build/Release/node-loot');

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
  constructor() {
    super('LOOT process died');
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
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

    this.id = this.generateId();
    this.ipc = new net.Server();
    try {
      // this seems to fail for some users with EINVAL. why?
      // May be a wine-only problem but that's not confirmed
      this.ipc.listen(`\\\\?\\pipe\\loot-ipc-${this.id}`, () => {
        this.ipc.on('connection', socket => {
          this.socket = socket;
          socket
          .on('data', data => {
            try {
              const messages = data.toString().split('\uFFFF').filter(msg => msg.length > 0);
              messages.forEach(msg => this.handleResponse(JSON.parse(msg)));
            } catch (err) {
              this.logCallback(4, err.message);
            }
          })
          .on('error', err => {
            if (!!this.currentCallback) {
              this.currentCallback(err);
              this.currentCallback = undefined;
            } else {
              this.logCallback(4, err.message);
            }
          });
        })

        this.restart(initCallback);
      })
      .on('error', (err) => {
        initCallback(err);
      });
    } catch (err) {
      initCallback(new Error('failed to establish pipe'));
    }
  }

  restart(callback) {
    this.worker = this.onFork(`${__dirname}${path.sep}async.js`, [this.id]);
    this.currentCallback = () => {
      this.enqueue({
        type: 'init',
        args: this.initArgs,
      }, callback);
    }
  }

  generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let res = [];
    for (let i = 0; i < 8; ++i) {
      res.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return res.join('');
  }

  close() {
    this.enqueue({ type: 'terminate' }, () => {
      this.worker = undefined;
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

  deliver(message, callback) {
    this.currentCallback = callback;
    const handleError = err => {
      if (!!err) {
        if (!!this.currentCallback) {
          if (err.code === 'EPIPE') {
            this.currentCallback(new RemoteDied());
          } else {
            this.currentCallback(err);
          }
        }
        this.processQueue();
      }
    };
    try {
      this.socket.write(JSON.stringify(message), handleError);
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
  Loot,
  LootAsync,
  IsCompatible,
};
