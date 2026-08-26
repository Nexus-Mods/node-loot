import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';

// A throwaway game installation, removed once the test finishes.
export function makeGameDir() {
  const gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'node-loot-test-'));
  onTestFinished(() => fs.rmSync(gamePath, { recursive: true, force: true }));

  const dataPath = path.join(gamePath, 'Data');
  const localPath = path.join(gamePath, 'local');
  fs.mkdirSync(dataPath);
  fs.mkdirSync(localPath);

  return { gamePath, dataPath, localPath };
}
