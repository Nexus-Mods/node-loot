import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';

import { makeGameDir } from './helpers/gameDir.js';
import { Loot, LootAsync } from '../index.js';

const MASTER = 'meister ö.esm';
const ASCII_PLUGIN = 'ascii.esp';
const NON_ASCII_PLUGINS = [
  'gösta!!!.esp', // latin-1
  '日本語テスト.esp', // outside latin-1
  'emoji🎮test.esp', // outside the basic multilingual plane
];
const ALL_PLUGINS = [MASTER, ASCII_PLUGIN, ...NON_ASCII_PLUGINS];

// The smallest plugin libloot accepts: a TES4 record header, the HEDR subrecord carrying the plugin
// format version, and a MAST/DATA pair per master.
function pluginBytes(masters = []) {
  const hedr = Buffer.alloc(18);
  hedr.write('HEDR', 0, 'ascii');
  hedr.writeUInt16LE(12, 4); // size of the subrecord data
  hedr.writeFloatLE(1.7, 6); // plugin format version
  hedr.writeInt32LE(0, 10); // record count
  hedr.writeUInt32LE(0x800, 14); // next object id
  const subrecords = [hedr];

  for (const master of masters) {
    // strings held inside a plugin record are windows-1252, not utf-8
    const name = Buffer.from(master + '\0', 'latin1');
    const mast = Buffer.alloc(6 + name.length);
    mast.write('MAST', 0, 'ascii');
    mast.writeUInt16LE(name.length, 4);
    name.copy(mast, 6);
    const data = Buffer.alloc(14);
    data.write('DATA', 0, 'ascii');
    data.writeUInt16LE(8, 4);
    subrecords.push(mast, data);
  }

  const body = Buffer.concat(subrecords);
  const header = Buffer.alloc(24);
  header.write('TES4', 0, 'ascii');
  header.writeUInt32LE(body.length, 4); // size of the record data
  header.writeUInt16LE(44, 20); // form version
  return Buffer.concat([header, body]);
}

// A throwaway Skyrim SE installation holding every test plugin.
function makeGameWithPlugins() {
  const { gamePath, dataPath, localPath } = makeGameDir();
  fs.writeFileSync(path.join(dataPath, MASTER), pluginBytes());
  for (const name of [ASCII_PLUGIN, ...NON_ASCII_PLUGINS]) {
    fs.writeFileSync(path.join(dataPath, name), pluginBytes([MASTER]));
  }
  return { gamePath, localPath };
}

function makeGame() {
  const { gamePath, localPath } = makeGameWithPlugins();
  return new Loot('skyrimse', gamePath, localPath, 'en', () => {});
}

describe('loadPlugins', () => {
  it('loads a plugin', () => {
    const loot = makeGame();

    loot.loadPlugins([ASCII_PLUGIN], true);

    expect(loot.getPlugin(ASCII_PLUGIN).name).toBe(ASCII_PLUGIN);
  });

  it.each(NON_ASCII_PLUGINS)('loads %s', (name) => {
    const loot = makeGame();

    loot.loadPlugins([name], true);

    expect(loot.getPlugin(name).name).toBe(name);
  });

  it('reports a master whose file name contains non-ascii characters', () => {
    const loot = makeGame();

    loot.loadPlugins(ALL_PLUGINS, true);

    for (const name of NON_ASCII_PLUGINS) {
      expect(loot.getPlugin(name).masters).toEqual([MASTER]);
    }
  });

  it('names a missing plugin as it was given', () => {
    const loot = makeGame();

    // libloot escapes non-ascii bytes in its messages, so match on the utf-8 of "ä"
    expect(() => loot.loadPlugins(['nicht dä.esp'], true))
      .toThrow(/nicht d\\xc3\\xa4\.esp/);
  });
});

describe('sortPlugins', () => {
  it('sorts plugins whose file names contain non-ascii characters', () => {
    const loot = makeGame();
    loot.loadPlugins(ALL_PLUGINS, true);

    const sorted = loot.sortPlugins(ALL_PLUGINS);

    expect([...sorted].sort()).toEqual([...ALL_PLUGINS].sort());
  });
});

describe('LootAsync', () => {
  it('loads and sorts non-ascii plugin names', async () => {
    const { gamePath, localPath } = makeGameWithPlugins();

    const loot = await new Promise((resolve, reject) => {
      LootAsync.create('skyrimse', gamePath, localPath, 'en', () => {}, undefined,
        (err, res) => (err ? reject(err) : resolve(res)));
    });
    onTestFinished(() => loot.close());

    await new Promise((resolve, reject) => {
      loot.loadPlugins(ALL_PLUGINS, true, (err) => (err ? reject(err) : resolve()));
    });
    const sorted = await new Promise((resolve, reject) => {
      loot.sortPlugins(ALL_PLUGINS, (err, res) => (err ? reject(err) : resolve(res)));
    });

    expect([...sorted].sort()).toEqual([...ALL_PLUGINS].sort());
  });
});
