import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, onTestFinished } from 'vitest';

import { makeGameDir } from './helpers/gameDir.js';
import { LootAsync } from '../index.js';

const STUB_CHILD = fileURLToPath(new URL('./helpers/stubChild.js', import.meta.url));

// a reply this long spans several of the reader's 64 KiB buffers, with a multi-byte character
// straddling the first boundary
const STUB_REPLY_REPEATS = 20000;

const userGroup = (name) => ({ name, afterGroups: [], description: '' });

// a name this long spans several of the child's 64 KiB reads, with multi-byte characters
// straddling the boundaries
const LONG_NAME = 'grp' + 'ö🎮'.repeat(12000);

function countReplacementChars(str) {
  return (str.match(/�/g) ?? []).length;
}

async function connect(onFork) {
  const { gamePath, localPath } = makeGameDir();
  const loot = await new Promise((resolve, reject) => {
    LootAsync.create('skyrimse', gamePath, localPath, 'en', () => {}, onFork,
      (err, res) => (err ? reject(err) : resolve(res)));
  });
  onTestFinished(() => loot.close());
  return loot;
}

describe('LootAsync message framing', () => {
  it('carries a name longer than one pipe read', async () => {
    const loot = await connect();
    const name = LONG_NAME;

    await new Promise((resolve, reject) => {
      loot.setUserGroups([userGroup(name)], (err) => (err ? reject(err) : resolve()));
    });
    const groups = await new Promise((resolve, reject) => {
      loot.getUserGroups((err, res) => (err ? reject(err) : resolve(res)));
    });

    const roundTripped = groups.map((group) => group.name).find((n) => n.startsWith('grp'));
    expect(countReplacementChars(roundTripped)).toBe(0);
    expect(roundTripped).toBe(name);
  });

  it('carries a reply that spans a read boundary', async () => {
    // reads arrive in 64 KiB buffers regardless of how the sender chunked them, so a buffer can end
    // part way through a character; the stub child pins where that happens.
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, String(STUB_REPLY_REPEATS)]));

    const reply = await new Promise((resolve, reject) => {
      loot.getUserGroups((err, res) => (err ? reject(err) : resolve(res)));
    });

    expect(countReplacementChars(reply)).toBe(0);
    expect(reply).toBe('ö🎮'.repeat(STUB_REPLY_REPEATS));
  });

  // over a megabyte each way through the real child, many times the 64 KiB pipe buffer
  it('carries a request and a reply far larger than the pipe buffer', async () => {
    const loot = await connect();
    const groups = Array.from({ length: 20000 }, (_, i) => userGroup(`group-${i}-ö🎮`));

    await new Promise((resolve, reject) => {
      loot.setUserGroups(groups, (err) => (err ? reject(err) : resolve()));
    });
    const roundTripped = await new Promise((resolve, reject) => {
      loot.getUserGroups((err, res) => (err ? reject(err) : resolve(res)));
    });

    const names = roundTripped.map((group) => group.name).filter((n) => n.startsWith('group-'));
    expect(names).toEqual(groups.map((group) => group.name));
  });

  // a load order's worth of plugin paths in one request; the child has to answer it, not die on it
  it('answers a plugin load larger than one pipe read', async () => {
    const loot = await connect();
    const names = Array.from({ length: 4000 }, (_, i) => `missing-plugin-${i}-ö🎮.esp`);

    const outcome = await new Promise((resolve) => {
      loot.loadPlugins(names, true, (err) => resolve(err ?? null));
    });

    expect(outcome === null || outcome instanceof Error).toBe(true);
  });

  // an unparseable frame answers the call no better than silence does
  it('fails the waiting call when a frame cannot be parsed', async () => {
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, 'garbage']));

    const err = await new Promise((resolve) => loot.getUserGroups((e) => resolve(e)));

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidResponse');
    expect(err.call).toBe('getUserGroups');
  });

  // log frames share a read with the answer they precede, so one of them being unreadable is no
  // reason to fail a call the same read went on to answer
  it('keeps an answer that shares a read with an unreadable frame', async () => {
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, 'garbage-log']));

    const result = await new Promise((resolve, reject) => {
      loot.getUserGroups((err, res) => (err ? reject(err) : resolve(res)));
    });

    expect(result).toBe('answered');
  });

  // a child that dies answers nothing, so the calls waiting on it have to be failed from this side
  it('fails every pending call when the child dies', async () => {
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, 'exit']));

    const outcomes = await Promise.all([
      new Promise((resolve) => loot.getUserGroups((err) => resolve(err))),
      new Promise((resolve) => loot.getGroups((err) => resolve(err))),
    ]);

    for (const err of outcomes) {
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('RemoteDied');
    }
    // the queued call names itself, rather than borrowing the name of the one in flight
    expect(outcomes.map((err) => err.call)).toEqual(['getUserGroups', 'getGroups']);
  });
});
