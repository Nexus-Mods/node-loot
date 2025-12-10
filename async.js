const net = require('net');

const { Loot, SetErrorLanguageEN } = require('./build/Release/node-loot');

process.on('uncaughtException', error => {
  console.error(error.message);
  process.exit(1);
});

const CHUNK_SIZE = 32 * 1024;

const client = net.connect(`\\\\?\\pipe\\loot-ipc-${process.argv[2]}`, (arg) => {
  let instance;
  let dataBuffer = '';

  function send(args) {
    const message = JSON.stringify(args) + '\uFFFF';
    // Chunk large messages to avoid Windows named pipe size limits
    for (let i = 0; i < message.length; i += CHUNK_SIZE) {
      client.write(message.slice(i, i + CHUNK_SIZE));
    }
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
    dataBuffer += buffer.toString();
    const messages = dataBuffer.split('\uFFFF');
    // Keep incomplete chunk (last element after split if no trailing delimiter)
    if (!dataBuffer.endsWith('\uFFFF')) {
      dataBuffer = messages.pop();
    } else {
      dataBuffer = '';
    }
    // Process each complete message
    for (const msg of messages) {
      if (msg.length > 0) {
        handleEvent(JSON.parse(msg));
      }
    }
  });

  // signal readiness to process messages
  send({ result: null });
});
