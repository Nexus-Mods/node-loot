const net = require('net');

const { Loot, SetErrorLanguageEN } = require('./build/Release/node-loot');

process.on('uncaughtException', error => {
  console.error(error.message);
  process.exit(1);
});

const client = net.connect(`\\\\?\\pipe\\loot-ipc-${process.argv[2]}`, (arg) => {
  let instance;

  function send(args) {
    client.write(JSON.stringify(args) + '\uFFFF');
  }

  function handleEvent(event) {
    let result;
    try {
      if (event.type === 'init') {
        SetErrorLanguageEN();
        instance = new Loot(...event.args, logCallback);
      } else if (event.type === 'terminate') {
        send({});
        process.exit(0);
      } else {
        result = instance[event.type](...event.args);
      }
      send({ result });
    } catch (error) {
      send({ error: error.message, extraArgs: JSON.stringify(error) });
    }
  }

  function logCallback(level, message) {
    // don't relay trace and debug. Make this configurable in the future
    if (level > 1) {
      send({ log: { level, message } });
    }
  }

  client.on('data', buffer => {
    handleEvent(JSON.parse(buffer.toString()));
  });

  // signal readiness to process messages
  send({ result: null });
});
