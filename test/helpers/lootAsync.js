import { onTestFinished } from 'vitest';

import { makeGameDir } from './gameDir.js';
import { LootAsync } from '../../index.js';

// A LootAsync instance over a throwaway game, closed once the test finishes; `onFork` replaces
// the worker process.
export async function connect(onFork) {
  const { gamePath, localPath } = makeGameDir();
  const loot = await LootAsync.create('skyrimse', gamePath, localPath, 'en', () => {}, onFork);
  onTestFinished(() => loot.close());
  return loot;
}
