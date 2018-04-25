const nbind = require('nbind');
const attachBindings = require('./bindings');

let binding;
try {
  binding = nbind.init(`${__dirname}/loot`);
} catch (err) {
  // only happens during testing from node
  binding = nbind.init();
}

attachBindings(binding);

const lib = binding.lib;

let instance;

function logCallback(level, message) {
  // don't relay trace and debug. Make this configurable in the future
  if (level > 1) {
    process.send({ log: { level, message } });
  }
}

process.on('message', event => {
  let result;
  try {
    if (event.type === 'init') {
      instance = new lib.Loot(...event.args, logCallback);
    } else {
      result = instance[event.type](...event.args);
    }
    process.send({ result });
  } catch (error) {
    process.send({ error: error.message });
  }
});

// signal readiness to process messages
process.send({ result: null });
