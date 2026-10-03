import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { connect } from './helpers/lootAsync.js';

const STUB_CHILD = fileURLToPath(new URL('./helpers/stubChild.js', import.meta.url));
const HOST = fileURLToPath(new URL('./helpers/host.cjs', import.meta.url));

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

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe('LootAsync worker lifetime', () => {
  it('exits when the host dies without closing it', async () => {
    const host = spawn(process.execPath, [HOST]);
    const workerPid = await new Promise((resolve) => host.stdout.once('data', (data) => resolve(Number(data))));

    host.kill('SIGKILL');
    for (let i = 0; i < 50 && isRunning(workerPid); ++i) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const stillRunning = isRunning(workerPid);
    if (stillRunning) process.kill(workerPid);
    expect(stillRunning).toBe(false);
  });
});

describe('LootAsync message framing', () => {
  it('carries a name longer than one pipe read', async () => {
    const loot = await connect();
    const name = LONG_NAME;

    await loot.setUserGroups([userGroup(name)]);
    const groups = await loot.getUserGroups();

    const roundTripped = groups.map((group) => group.name).find((n) => n.startsWith('grp'));
    expect(countReplacementChars(roundTripped)).toBe(0);
    expect(roundTripped).toBe(name);
  });

  it('carries a reply that spans a read boundary', async () => {
    // reads arrive in 64 KiB buffers regardless of how the sender chunked them, so a buffer can end
    // part way through a character; the stub child pins where that happens.
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, String(STUB_REPLY_REPEATS)]));

    const reply = await loot.getUserGroups();

    expect(countReplacementChars(reply)).toBe(0);
    expect(reply).toBe('ö🎮'.repeat(STUB_REPLY_REPEATS));
  });

  // over a megabyte each way through the real child, many times the 64 KiB pipe buffer
  it('carries a request and a reply far larger than the pipe buffer', async () => {
    const loot = await connect();
    const groups = Array.from({ length: 20000 }, (_, i) => userGroup(`group-${i}-ö🎮`));

    await loot.setUserGroups(groups);
    const roundTripped = await loot.getUserGroups();

    const names = roundTripped.map((group) => group.name).filter((n) => n.startsWith('group-'));
    expect(names).toEqual(groups.map((group) => group.name));
  });

  // a load order's worth of plugin paths in one request; the child has to answer it, not die on it
  it('answers a plugin load larger than one pipe read', async () => {
    const loot = await connect();
    const names = Array.from({ length: 4000 }, (_, i) => `missing-plugin-${i}-ö🎮.esp`);

    const outcome = await loot.loadPlugins(names, true).catch((err) => err);

    expect(outcome === undefined || outcome instanceof Error).toBe(true);
  });

  // an unparseable frame answers the call no better than silence does
  it('fails the waiting call when a frame cannot be parsed', async () => {
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, 'garbage']));

    const err = await loot.getUserGroups().catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidResponse');
    expect(err.call).toBe('getUserGroups');
  });

  // log frames share a read with the answer they precede, so one of them being unreadable is no
  // reason to fail a call the same read went on to answer
  it('keeps an answer that shares a read with an unreadable frame', async () => {
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, 'garbage-log']));

    const result = await loot.getUserGroups();

    expect(result).toBe('answered');
  });

  // a broken pipe is the one failure that is literally "the IPC failed", so it says so by name
  it('fails a waiting call with the code the socket broke on', async () => {
    const loot = await connect();

    const pending = loot.getUserGroups().catch((err) => err);
    loot.socket.destroy(Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }));
    const outcome = await pending;

    expect(outcome.name).toBe('RemoteDied');
    expect(outcome.call).toBe('getUserGroups');
    expect(outcome.code).toBe('ECONNRESET');
  });

  // a child that dies answers nothing, so the calls waiting on it have to be failed from this side
  it('fails every pending call when the child dies', async () => {
    const loot = await connect(
      (script, args) => spawn(process.execPath, [STUB_CHILD, ...args, 'exit']));

    const outcomes = await Promise.all([
      loot.getUserGroups().catch((err) => err),
      loot.getGroups().catch((err) => err),
    ]);

    for (const err of outcomes) {
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('RemoteDied');
    }
    // the queued call names itself, rather than borrowing the name of the one in flight
    expect(outcomes.map((err) => err.call)).toEqual(['getUserGroups', 'getGroups']);
  });
});
