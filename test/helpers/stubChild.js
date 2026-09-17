// A stand-in for async.js. It speaks the same framing but answers every request with a payload of a
// size the caller dictates, so a test can decide exactly where the reader's buffer boundaries land.
const net = require('net');
const { StringDecoder } = require('string_decoder');

// mode is either a repeat count for the reply, or the name of a way to fail
const [, , id, mode] = process.argv;

const client = net.connect(`\\\\?\\pipe\\loot-ipc-${id}`, () => {
  const decoder = new StringDecoder('utf8');
  let dataBuffer = '';

  const send = (args) => client.write(Buffer.from(JSON.stringify(args) + '￿', 'utf8'));

  client.on('data', (buffer) => {
    dataBuffer += decoder.write(buffer);
    const messages = dataBuffer.split('￿');
    dataBuffer = messages.pop();
    for (const message of messages) {
      if (message.length === 0) {
        continue;
      }
      const { type } = JSON.parse(message);
      if (type === 'terminate') {
        send({});
        process.exit(0);
      }
      // a child that dies on its first real request, for the caller's handling of it
      if (mode === 'exit' && type !== 'init') {
        process.exit(1);
      }
      // a child that answers with a frame the caller cannot parse
      if (mode === 'garbage' && type !== 'init') {
        client.write('{"result": unquoted}￿');
        continue;
      }
      // an unreadable log frame ahead of a good answer, in one write
      if (mode === 'garbage-log' && type !== 'init') {
        client.write('{"log": unquoted}￿' + JSON.stringify({ result: 'answered' }) + '￿');
        continue;
      }
      send({ result: 'ö🎮'.repeat(Number(mode)) });
    }
  });

  // signal readiness to process messages
  send({ result: null });
});
