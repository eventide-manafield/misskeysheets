/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prepare, install } from '../scripts/install.mjs';
const exec = promisify(execFile);
const git = async (host, ...args) => (await exec('git', ['-C', host, ...args])).stdout;
async function fixture(t) {
 const folder = await mkdtemp(join(tmpdir(), 'sheet installer '));
 t.after(() => rm(folder, { recursive: true, force: true }));
 const host = join(folder, 'host with spaces'), kit = join(folder, 'kit');
 const put = async (base, name, text) => { await mkdir(dirname(join(base, name)), { recursive: true }); await writeFile(join(base, name), text); };
 await put(host, 'packages/frontend/src/example.ts', 'before\n');
 await put(host, 'packages/i18n/src/index.ts', "import { languages, primaries } from './const.js';\n\t\treturn a;\n\t}, {} as Record<Language, Locale>);\n");
 await git(host, 'init', '-q'); await git(host, 'add', '.'); await git(host, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
 await put(kit, 'src/index.ts', 'portable\n');
 await put(kit, 'adapters/misskey.ts', "import type { SheetHost } from '../src/host.js';\n");
 await put(kit, 'integration/files/packages/i18n/src/noctemblith-sheet.ts', 'translations\n');
 await put(kit, 'integration/misskey.patch', 'diff --git a/packages/frontend/src/example.ts b/packages/frontend/src/example.ts\n--- a/packages/frontend/src/example.ts\n+++ b/packages/frontend/src/example.ts\n@@ -1 +1 @@\n-before\n+after\n');
 return { host, kit, put };
}
test('preview does not write; install integrates patch, adapter, translations and backup', async t => {
 const { host, kit } = await fixture(t);
 const plan = await prepare(host, kit);
 assert.equal(await git(host, 'status', '--porcelain'), '');
 const backup = await install(plan);
 assert.equal(await readFile(join(host, 'packages/frontend/src/example.ts'), 'utf8'), 'after\n');
 assert.match(await readFile(join(host, 'packages/frontend/src/ui/sheet/adapters/misskey.ts'), 'utf8'), /from '..\/host.js'/);
 assert.match(await readFile(join(host, 'packages/i18n/src/index.ts'), 'utf8'), /if \(sheetCopy\) a\[key\]._sheetMode/);
 assert.equal(await readFile(join(backup, 'packages/frontend/src/example.ts'), 'utf8'), 'before\n');
});
test('incompatible patch stops without changing host', async t => {
 const { host, kit, put } = await fixture(t);
 await put(kit, 'integration/misskey.patch', (await readFile(join(kit, 'integration/misskey.patch'), 'utf8')).replace('-before', '-missing'));
 await assert.rejects(prepare(host, kit));
 assert.equal(await git(host, 'status', '--porcelain'), '');
});
test('dirty host and edits made after preview are refused', async t => {
 const { host, kit, put } = await fixture(t);
 const plan = await prepare(host, kit);
 await put(host, 'packages/frontend/src/example.ts', 'user edit\n');
 await assert.rejects(install(plan), /changed after preview/);
 await assert.rejects(prepare(host, kit), /must be clean/);
 assert.equal(await readFile(join(host, 'packages/frontend/src/example.ts'), 'utf8'), 'user edit\n');
});
test('symlink destination cannot write outside host', { skip: process.platform === 'win32' }, async t => {
 const { host, kit } = await fixture(t);
 await mkdir(join(host, 'packages/frontend/src/ui'), { recursive: true });
 await symlink(kit, join(host, 'packages/frontend/src/ui/sheet'));
 await git(host, 'add', '.'); await git(host, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'link');
 await assert.rejects(prepare(host, kit), /Symlink/);
});
test('unsupported locale loader stops before any write', async t => {
 const { host, kit, put } = await fixture(t);
 await put(host, 'packages/i18n/src/index.ts', 'different loader\n');
 await git(host, 'add', '.'); await git(host, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'loader');
 await assert.rejects(prepare(host, kit), /Unsupported locale loader/);
 assert.equal(await git(host, 'status', '--porcelain'), '');
});
test('write failure restores patched files and removes copied sources', async t => {
 const { host, kit } = await fixture(t);
 const plan = await prepare(host, kit);
 // Simulate a rejected destination after the patch and source writes have begun.
 plan.writes.set('../outside-host', Buffer.from('blocked'));
 await assert.rejects(install(plan), /original files restored/);
 assert.equal(await readFile(join(host, 'packages/frontend/src/example.ts'), 'utf8'), 'before\n');
 assert.equal(await git(host, 'status', '--porcelain'), '');
});
test('Windows CRLF locale loader remains CRLF after integration', async t => {
 const { host, kit, put } = await fixture(t);
 const name = 'packages/i18n/src/index.ts';
 await put(host, name, (await readFile(join(host, name), 'utf8')).replaceAll('\n', '\r\n'));
 await git(host, 'add', '.');
 await git(host, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'CRLF');
 const plan = await prepare(host, kit);
 await install(plan);
 const text = await readFile(join(host, name), 'utf8');
 assert.match(text, /noctemblithSheetTranslations/);
 assert.equal(text.replaceAll('\r\n', '').includes('\n'), false);
});
