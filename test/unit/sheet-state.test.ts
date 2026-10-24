/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { describe, expect, it, vi } from 'vitest';
import { sheetShellState } from '../../src/navigation.js';
import { createSheetSubmission } from '../../src/submission.js';
import { createSheetState, loadSheet } from '../../src/state.js';

describe('manual sheet snapshots', () => {
	it('keeps sheets independent', async () => {
		const home = createSheetState();
		const local = createSheetState();
		await loadSheet(home, async () => [{ id: 'home' }]);
		await loadSheet(local, async () => [{ id: 'local' }]);
		expect(home.items).toEqual([{ id: 'home' }]);
		expect(local.items).toEqual([{ id: 'local' }]);
	});
	it('ignores stale responses after a newer refresh', async () => {
		const state = createSheetState();
		let complete!: (items: { id: string }[]) => void;
		const stale = loadSheet(state, () => new Promise(resolve => { complete = resolve; }));
		await loadSheet(state, async () => [{ id: 'new' }]);
		const updatedAt = state.updatedAt;
		complete([{ id: 'old' }]);
		await stale;
		expect(state.items).toEqual([{ id: 'new' }]);
		expect(state.updatedAt).toBe(updatedAt);
		expect(state.loading).toBe(false);
	});
	it('preserves the previous data and timestamp after failure', async () => {
		const state = createSheetState();
		await loadSheet(state, async () => [{ id: 'saved' }]);
		const updatedAt = state.updatedAt;
		await loadSheet(state, async () => { throw new Error('offline'); });
		expect(state.items).toEqual([{ id: 'saved' }]);
		expect(state.updatedAt).toBe(updatedAt);
		expect(state.error).toBe(true);
	});
	it('uses raw cursor and deduplicates overlapping older pages', async () => {
		const state = createSheetState();
		await loadSheet(state, async () => Array.from({ length: 30 }, (_, i) => ({ id: String(100 - i) })));
		const fetch = vi.fn(async () => [{ id: '71' }, { id: '70' }]);
		await loadSheet(state, fetch, true);
		expect(fetch).toHaveBeenCalledWith('71');
		expect(state.items).toHaveLength(31);
		expect(state.items.at(-1)?.id).toBe('70');
		expect(state.more).toBe(false);
	});
	it('prevents concurrent load-more requests', async () => {
		const state = createSheetState();
		state.more = true;
		let complete!: (items: { id: string }[]) => void;
		const first = loadSheet(state, () => new Promise(resolve => { complete = resolve; }), true);
		const fetch = vi.fn();
		await loadSheet(state, fetch, true);
		expect(fetch).not.toHaveBeenCalled();
		complete([]);
		await first;
	});
});

describe('sheet submission lock', () => {
	it('blocks repeated submission throughout asynchronous preparation and API work', async () => {
		const lock = createSheetSubmission();
		let finish!: () => void;
		const send = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
		const first = lock.run(send);
		await lock.run(send);
		expect(send).toHaveBeenCalledTimes(1);
		expect(lock.pending).toBe(true);
		finish();
		await first;
		expect(lock.pending).toBe(false);
	});
	it('releases after failure so preserved drafts can be retried', async () => {
		const lock = createSheetSubmission();
		await expect(lock.run(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
		expect(lock.pending).toBe(false);
		const retry = vi.fn(async () => {});
		await lock.run(retry);
		expect(retry).toHaveBeenCalledTimes(1);
	});
});

describe('sheet menu route and shell lifecycle', () => {
	it('opens the direct route even with the saved home preference off', () => {
		expect(sheetShellState(true, false, 'spreadsheet')).toEqual({ mounted: true, visible: true });
	});
	it('never exposes the sheet to a signed-out user', () => {
		expect(sheetShellState(false, true, 'spreadsheet')).toEqual({ mounted: false, visible: false });
	});
	it('retains preferred sheet state while normal pages own common UI', () => {
		expect(sheetShellState(true, true, 'settings')).toEqual({ mounted: true, visible: false });
		expect(sheetShellState(true, true, undefined)).toEqual({ mounted: true, visible: false });
	});
	it('returns to normal home after clearing the preference', () => {
		expect(sheetShellState(true, false, 'index')).toEqual({ mounted: false, visible: false });
		expect(sheetShellState(true, true, 'index')).toEqual({ mounted: true, visible: true });
	});
});
