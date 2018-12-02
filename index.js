const nbind = require('nbind');
const net = require('net');
const path = require('path');

const attachBindings = require('./bindings');

// in electron renderer thread we have native webworkers,
// otherwise we need a module

let binding;
try {
  binding = nbind.init(path.join(__dirname, 'loot'));
} catch (err) {
  binding = nbind.init();
}

attachBindings(binding);

const lib = binding.lib;

class LootAsync {
  static create(gameId, gamePath, gameLocalPath, language, logCallback, onFork, callback) {
    const res = new LootAsync(gameId, gamePath, gameLocalPath, language, logCallback, onFork, (err) => {
      if (err !== null) {
        callback(err);
      } else {
        callback(null, res);
      }
    });
  }

  constructor(gameId, gamePath, gameLocalPath, language, logCallback, onFork, callback) {
    this.queue = [];
    this.logCallback = logCallback;

    this.currentCallback = () => {
      this.enqueue({
        type: 'init',
        args: [
          gameId,
          gamePath,
          gameLocalPath,
          language,
        ]
      }, callback);
    }

    this.makeProxy('updateMasterlist');
    this.makeProxy('getMasterlistRevision');
    this.makeProxy('loadLists');
    this.makeProxy('loadPlugins');
    this.makeProxy('getPlugin');
    this.makeProxy('getPluginMetadata');
    this.makeProxy('sortPlugins');
    this.makeProxy('getGroups');
    this.makeProxy('getUserGroups');
    this.makeProxy('setUserGroups');

    const id = this.generateId();
    this.ipc = new net.Server();
    this.ipc.listen(`\\\\?\\pipe\\loot-ipc-${id}`, () => {
      this.ipc.on('connection', socket => {
        this.socket = socket;
        socket.on('data', data => {
          this.handleResponse(JSON.parse(data.toString()));
        })
      })

      this.worker = onFork(`${__dirname}${path.sep}async.js`, [id]);
    });
  }

  generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let res = [];
    for (let i = 0; i < 8; ++i) {
      res.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return res.join('');
  }

  makeProxy(name) {
    this[name] = (...args) => {
      this.enqueue({
        type: name,
        args: args.slice(0, args.length - 1),
      }, args[args.length - 1]);
    };
  }

  enqueue(message, callback) {
    if (this.currentCallback === null) {
      this.deliver(message, callback);
    } else {
      this.queue.push({ message, callback });
    }
  }

  deliver(message, callback) {
    this.currentCallback = callback;
    try {
      this.socket.write(JSON.stringify(message));
    } catch (err) {
      this.currentCallback(new Error('LOOT closed? Please check your log. Error was: ' + err.message));
      this.processQueue();
    }
  }

  processQueue() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.deliver(next.message, next.callback);
    } else {
      this.currentCallback = null;
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
      if (msg.error) {
        this.currentCallback(new Error(msg.error));
      } else {
        this.currentCallback(null, msg.result);
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

module.exports = Object.assign(lib, {
  LootAsync
});
