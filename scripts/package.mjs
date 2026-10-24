/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.argv[2] ?? join(root, 'artifacts/misskey-spreadsheet-mode-source.tar.gz'));
const temp = await mkdtemp(join(tmpdir(), 'sheet-repository-'));
try {
	const kit = join(temp, 'misskey-spreadsheet-mode');
	await mkdir(kit);
	for (const name of ['src', 'adapters', 'integration', 'docs', 'test', 'scripts', 'package.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'README.md', 'COPYING', 'AGENTS.md', '.gitignore']) {
		await cp(join(root, name), join(kit, name), { recursive: true });
	}
	await mkdir(dirname(output), { recursive: true });
	await exec('tar', ['-czf', output, '-C', temp, 'misskey-spreadsheet-mode']);
	console.log(output);
} finally { await rm(temp, { recursive: true, force: true }); }
