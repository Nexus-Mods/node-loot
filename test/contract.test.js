import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { connect } from './helpers/lootAsync.js';
import {
  AlreadyClosed,
  InvalidResponse,
  LogLevel,
  Loot,
  LootAsync,
  PluginNotLoaded,
  RemoteDied,
} from '../index.js';

const nativeMethods = () =>
  Object.getOwnPropertyNames(Loot.prototype).filter((name) => name !== 'constructor').sort();

// the methods index.d.ts declares on Loot, the one list LootAsync's declaration derives from
function declaredLootMethods() {
  const declaration = fs.readFileSync(new URL('../index.d.ts', import.meta.url), 'utf8');
  const body = declaration.match(/export class Loot \{([\s\S]*?)\n\}/)[1];
  return [...body.matchAll(/^\s+(\w+)\(/gm)]
    .map((match) => match[1])
    .filter((name) => name !== 'constructor')
    .sort();
}

describe('LootAsync contract', () => {
  it('declares exactly the native Loot methods', () => {
    expect(declaredLootMethods()).toEqual(nativeMethods());
  });

  it('proxies exactly the native Loot methods and setLogLevel', async () => {
    const loot = await connect();

    // logCallback and onFork are the constructor's own callbacks, not proxies
    const proxied = Object.keys(loot)
      .filter((key) => typeof loot[key] === 'function' && !['logCallback', 'onFork'].includes(key))
      .sort();
    expect(proxied).toEqual([...nativeMethods(), 'setLogLevel'].sort());
  });

  it('has no native method named like a LootAsync member', () => {
    expect(nativeMethods().filter((name) => name in LootAsync.prototype)).toEqual([]);
  });

  it('resolves a call with the worker result', async () => {
    const loot = await connect();

    await expect(loot.getUserGroups()).resolves.toEqual(expect.any(Array));
  });

  it('rejects a call with the worker error', async () => {
    const loot = await connect();

    await expect(loot.loadLists('missing.yaml', '', '')).rejects.toBeInstanceOf(Error);
  });

  it('rejects a call made after close', async () => {
    const loot = await connect();
    loot.close();

    await expect(loot.getUserGroups()).rejects.toBeInstanceOf(AlreadyClosed);
  });

  it('sets the worker log level', async () => {
    const loot = await connect();

    await expect(loot.setLogLevel(LogLevel.debug)).resolves.toBeUndefined();
  });

  it('uses a flag left undefined as its default', async () => {
    const loot = await connect();

    await expect(loot.getPluginMetadata('missing.esp', undefined, false)).resolves.toBeUndefined();
  });

  it('rejects a required parameter left undefined', async () => {
    const loot = await connect();

    await expect(loot.loadLists(undefined, '', '')).rejects.toThrow(
      'parameter 1 expected to be a string',
    );
  });

  it('reports a plugin that is not loaded without the list of loaded plugins', () => {
    const err = new PluginNotLoaded({ plugin: 'missing.esp', func: 'getPlugin' });

    expect(err.currentlyLoaded).toEqual([]);
    expect(err.message).toContain('missing.esp');
  });

  it('settles create once when the IPC endpoint fails before the worker answers', async () => {
    let loot;
    // called as a method of the instance, so `this` is the LootAsync being created
    function onFork(script, args) {
      loot = this;
      spawn(process.execPath, [script, ...args]);
      this.ipc.emit('error', new Error('endpoint failed'));
    }

    await expect(connect(onFork)).rejects.toThrow('endpoint failed');
    onTestFinished(() => loot.close());
    // the worker's late init answer must not throw
    await vi.waitFor(() => expect(loot.currentCallback).toBeUndefined(), { timeout: 5000 });
  });

  it('exports the errors a call can reject with', () => {
    for (const ErrorClass of [AlreadyClosed, InvalidResponse, PluginNotLoaded, RemoteDied]) {
      expect(ErrorClass.prototype).toBeInstanceOf(Error);
    }
  });
});
