import path from 'node:path';
import { fileURLToPath } from 'node:url';

// libloot.dll ships next to the sources rather than next to the compiled addon, so it has to be on
// the search path before any test imports the addon.
const lootApiPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'loot_api');
process.env.PATH = [lootApiPath, process.env.PATH].join(path.delimiter);
