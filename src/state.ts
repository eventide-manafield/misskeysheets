/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type SheetState<T extends { id: string }> = {
	items: T[];
	initialized: boolean;
	loading: boolean;
	error: boolean;
	updatedAt: string | null;
	cursor: string | undefined;
	more: boolean;
	generation: number;
};
export function createSheetState<T extends { id: string }>(): SheetState<T> {
	return { items: [], initialized: false, loading: false, error: false, updatedAt: null, cursor: undefined, more: false, generation: 0 };
}
export async function loadSheet<T extends { id: string }>(
	state: SheetState<T>,
	fetch: (untilId?: string) => Promise<T[]>,
	append = false,
) {
	if (append && (state.loading || !state.more)) return;
	const generation = ++state.generation;
	state.loading = true;
	state.error = false;
	try {
		const page = await fetch(append ? state.cursor : undefined);
		if (generation !== state.generation) return;
		const items = append ? [...state.items, ...page] : page;
		state.items = [...new Map(items.map(item => [item.id, item])).values()];
		state.cursor = page.at(-1)?.id;
		state.more = page.length === 30;
		state.initialized = true;
		state.updatedAt = new Date().toISOString();
	} catch {
		if (generation === state.generation) state.error = true;
	} finally {
		if (generation === state.generation) state.loading = false;
	}
}
