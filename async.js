const net = require('net');
const { StringDecoder } = require('string_decoder');

const { Loot, SetErrorLanguageEN, SetLogLevel } = require('./build/Release/node-loot');

let send = (args) => {};

process.on('uncaughtException', error => {
  console.error(error.message);
  // the caller is listening on the pipe, not on stderr, so the reason goes there too
  try {
    send({ error: error.message, extraArgs: JSON.stringify(error) });
  } catch (err) {
    // the pipe is the thing that just broke; stderr already has it
  }
  process.exit(1);
});

let currentLogLevel = 2; // default: info (matches previous hardcoded filter)

const client = net.connect(`\\\\?\\pipe\\loot-ipc-${process.argv[2]}`, (arg) => {
  let instance;
  let dataBuffer = '';
  // a read can end mid-character; the decoder holds the incomplete sequence back until the
  // rest arrives
  const decoder = new StringDecoder('utf8');

  send = (args) => client.write(JSON.stringify(args) + '\uFFFF');

  function handleEvent(event) {
    let result;
    try {
      if (event.type === 'init') {
        SetErrorLanguageEN();
        instance = new Loot(...event.args, logCallback);
      } else if (event.type === 'setLogLevel') {
        currentLogLevel = event.args[0];
        SetLogLevel(event.args[0]);
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
    if (level >= currentLogLevel) {
      send({ log: { level, message } });
    }
  }

  client.on('data', buffer => {
    dataBuffer += decoder.write(buffer);
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
