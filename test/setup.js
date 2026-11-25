import path from 'node:path';
import { fileURLToPath } from 'node:url';

// libloot.dll ships next to the sources rather than next to the compiled addon, so the copy for
// this process's architecture has to be on the search path before any test imports the addon.
const lootApiPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'loot_api', process.arch);
process.env.PATH = [lootApiPath, process.env.PATH].join(path.delimiter);
