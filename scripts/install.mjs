/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFile, readdir, lstat, realpath, mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
const exec = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = async (host, ...args) => (await exec('git', ['-C', host, ...args], { maxBuffer: 8 * 1024 * 1024 })).stdout.trim();
const read = async path => readFile(path).catch(e => { if (e.code === 'ENOENT') return null; throw e; });

async function safePath(host, name) {
	const path = resolve(host, name);
	if (isAbsolute(name) || relative(host, path).startsWith('..')) throw new Error(`Unsafe path: ${name}`);
	let part = host;
	for (const segment of relative(host, path).split(/[\\/]/)) {
		part = join(part, segment);
		const info = await lstat(part).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
		if (info?.isSymbolicLink()) throw new Error(`Symlink destination is unsupported: ${name}`);
	}
	return path;
}

async function walk(folder, callback, prefix = '') {
	for (const entry of await readdir(folder, { withFileTypes: true })) {
		const name = prefix + entry.name;
		if (entry.isSymbolicLink()) throw new Error(`Source symlink is unsupported: ${name}`);
		if (entry.isDirectory()) await walk(join(folder, entry.name), callback, name + '/');
		else if (entry.isFile()) await callback(name, await readFile(join(folder, entry.name)));
	}
}

export async function prepare(target, moduleRoot = root) {
	const host = await realpath(resolve(target));
	if (await realpath(await git(host, 'rev-parse', '--show-toplevel')) !== host) throw new Error('Choose the host Git repository root.');
	if (await git(host, 'status', '--porcelain', '--untracked-files=all')) throw new Error('Host working tree must be clean. Commit or stash local changes first.');
	await lstat(join(host, 'packages/frontend/src'));
	const patch = join(moduleRoot, 'integration/misskey.patch');
	const patchText = await readFile(patch, 'utf8');
	const names = [...patchText.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(x => x[1]);
	if (!names.length || names.some(n => !n.startsWith('packages/frontend/src/') && n !== 'locales/ja-JP.yml')) throw new Error('Unsupported integration patch paths.');
	const writes = new Map();
	await walk(join(moduleRoot, 'src'), async (name, data) => {
		if (/\.(ts|vue)$/.test(name)) writes.set('packages/frontend/src/ui/sheet/' + name, data);
	});
	writes.set('packages/frontend/src/ui/sheet/adapters/misskey.ts', Buffer.from((await readFile(join(moduleRoot, 'adapters/misskey.ts'), 'utf8')).replace("from '../src/host.js'", "from '../host.js'")));
	await walk(join(moduleRoot, 'integration/files'), async (name, data) => {
		if (!name.startsWith('packages/frontend/src/') && !name.startsWith('packages/i18n/src/')) throw new Error(`Unsupported integration file: ${name}`);
		writes.set(name, data);
	});
	const localePath = 'packages/i18n/src/index.ts';
	const localeOriginal = await readFile(join(host, localePath), 'utf8');
	const locale = localeOriginal.replaceAll('\r\n', '\n');
	const anchor = '\t\treturn a;\n\t}, {} as Record<Language, Locale>);';
	if (locale.includes('noctemblithSheetTranslations') || locale.split(anchor).length !== 2 || !locale.includes("import { languages, primaries } from './const.js';")) throw new Error('Unsupported locale loader. Follow docs/PORTING.ko.md for manual integration.');
	const translatedLocale = locale.replace("import { languages, primaries } from './const.js';", "import { noctemblithSheetTranslations } from './noctemblith-sheet.js';\nimport { languages, primaries } from './const.js';").replace(anchor, "\t\tconst sheetCopy = noctemblithSheetTranslations[lang] ?? (lang === 'ja' ? undefined : noctemblithSheetTranslations.en);\n\t\tif (sheetCopy) a[key]._sheetMode = { ...sheetCopy };\n\n" + anchor);
	writes.set(localePath, Buffer.from(localeOriginal.includes('\r\n') ? translatedLocale.replaceAll('\n', '\r\n') : translatedLocale));
	const originals = new Map();
	for (const name of new Set([...names, ...writes.keys()])) {
		const path = await safePath(host, name);
		originals.set(name, await read(path));
		if (writes.has(name) && name !== localePath && originals.get(name) !== null) throw new Error(`Destination already exists: ${name}`);
	}
	await git(host, 'apply', '--check', '--', patch);
	return { host, patch, names, writes, originals };
}

export async function install(plan) {
	const { host, patch, originals, writes } = plan;
	// Recheck after the confirmation prompt so intervening edits are never overwritten.
	if (await git(host, 'status', '--porcelain', '--untracked-files=all')) throw new Error('Host changed after preview; run the installer again.');
	for (const [name, before] of originals) {
		const now = await read(await safePath(host, name));
		if (before === null ? now !== null : now === null || !before.equals(now)) throw new Error(`File changed after preview: ${name}`);
	}
	await git(host, 'apply', '--check', '--', patch);
	const gitDir = await git(host, 'rev-parse', '--absolute-git-dir');
	const backup = await mkdtemp(join(gitDir, 'sheet-install-'));
	for (const [name, data] of originals) {
		if (data === null) continue;
		await mkdir(dirname(join(backup, name)), { recursive: true });
		await writeFile(join(backup, name), data);
	}
	await writeFile(join(backup, 'manifest.json'), JSON.stringify({ files: [...originals].map(([path, data]) => ({ path, existed: data !== null })) }, null, 2));
	try {
		await git(host, 'apply', '--', patch);
		for (const [name, data] of writes) {
			const path = await safePath(host, name);
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, data);
		}
	} catch (error) {
		for (const [name, data] of originals) {
			const path = await safePath(host, name);
			if (data === null) await rm(path, { force: true });
			else await writeFile(path, data);
		}
		throw new Error(`Installation failed; original files restored. Backup: ${backup}`, { cause: error });
	}
	return backup;
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes('--help')) {
		console.log('Usage: install.sh|install.bat [HOST_ROOT] [--check | --yes]\nRequires Node.js 22+ and Git. --check previews only; --yes applies without prompting.');
		return;
	}
	if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required.');
	if (args.some(a => a.startsWith('--') && !['--check', '--yes'].includes(a)) || args.filter(a => !a.startsWith('--')).length > 1 || args.includes('--check') && args.includes('--yes')) throw new Error('Invalid arguments. Use --help.');
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		let target = args.find(a => !a.startsWith('--'));
		if (!target) {
			if (!process.stdin.isTTY) throw new Error('HOST_ROOT is required without an interactive terminal.');
			target = await rl.question('Misskey source repository path / 소스 경로: ');
		}
		const plan = await prepare(target);
		console.log(`\nHost: ${plan.host}\nPatch changes / 패치 변경:\n${plan.names.join('\n')}\nSource files / 소스 파일:\n${[...plan.writes.keys()].join('\n')}`);
		if (args.includes('--check')) { console.log('\nCompatibility checks passed. No files changed. / 검사 완료, 변경 없음.'); return; }
		if (!args.includes('--yes')) {
			if (!process.stdin.isTTY) throw new Error('Use --check or explicitly pass --yes in noninteractive mode.');
			if ((await rl.question('\nApply these changes? / 적용할까요? [y/N] ')).trim().toLowerCase() !== 'y') { console.log('Cancelled. / 취소했습니다.'); return; }
		}
		const backup = await install(plan);
		console.log(`\nSource integration complete / 소스 연결 완료.\nBackup: ${backup}\nNext: review git diff; regenerate locale types, run host typecheck/tests and build per docs/PORTING.ko.md.\n다음: git diff 검토 → 번역 타입 재생성 → 호스트 타입 검사·테스트·빌드.\nBuild, service restart and deployment were not run. / 빌드·서비스 재시작·배포는 실행하지 않았습니다.`);
	} finally { rl.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
	console.error(`Installer stopped / 설치 중단: ${error.message}\n${error.cause?.message ?? ''}`);
	process.exitCode = 1;
});
