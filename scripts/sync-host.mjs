/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] && resolve(process.argv[2]);
const mode = process.argv[3] ?? '--check';
if (!target || !['--check', '--write'].includes(mode)) throw new Error('Usage: node scripts/sync-host.mjs HOST_ROOT [--check|--write]');
await stat(join(target, 'packages/frontend/src'));
const files = [];
async function scan(folder) {
	for (const entry of await readdir(folder, { withFileTypes: true })) {
		if (entry.isSymbolicLink()) throw new Error('Unexpected source symlink: ' + entry.name);
		const path = join(folder, entry.name);
		if (entry.isDirectory()) await scan(path);
		else if (/\.(ts|vue)$/.test(entry.name)) files.push([join('packages/frontend/src/ui/sheet', relative(join(root, 'src'), path)), await readFile(path, 'utf8')]);
	}
}
await scan(join(root, 'src'));
files.push(['packages/frontend/src/ui/sheet/adapters/misskey.ts', (await readFile(join(root, 'adapters/misskey.ts'), 'utf8')).replace("from '../src/host.js'", "from '../host.js'")]);
let changed = 0;
for (const [name, text] of files) {
	const path = join(target, name);
	const existing = await readFile(path, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
	if (existing === text) continue;
	changed++;
	console.log((mode === '--write' ? 'WRITE ' : 'DIFF  ') + name);
	if (mode === '--write') { await mkdir(dirname(path), { recursive: true }); await writeFile(path, text); }
}
console.log(`${files.length} module files checked; ${changed} differences${mode === '--write' ? ' synchronized' : ''}. Host hooks, authentication and data were not changed.`);
if (mode === '--check' && changed) process.exitCode = 1;
