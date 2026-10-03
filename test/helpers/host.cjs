// A host process that starts a LootAsync worker, prints its pid and then idles until killed.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { LootAsync } = require('../../index.js');

const gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'node-loot-host-'));
fs.mkdirSync(path.join(gamePath, 'Data'));
fs.mkdirSync(path.join(gamePath, 'local'));

let workerPid;
LootAsync.create('skyrimse', gamePath, path.join(gamePath, 'local'), 'en', () => {}, (script, args) => {
  const worker = spawn(process.execPath, [script, ...args], { stdio: 'ignore' });
  workerPid = worker.pid;
  return worker;
}).then(() => console.log(workerPid));

setInterval(() => {}, 1000);
