import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';

// A throwaway game installation, removed once the test finishes; `folder` names the game's own
// directory inside the temp one, for paths that must carry particular characters.
export function makeGameDir(folder = 'game') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'node-loot-test-'));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));

  const gamePath = path.join(root, folder);
  const dataPath = path.join(gamePath, 'Data');
  const localPath = path.join(gamePath, 'local');
  fs.mkdirSync(dataPath, { recursive: true });
  fs.mkdirSync(localPath);

  return { gamePath, dataPath, localPath };
}
