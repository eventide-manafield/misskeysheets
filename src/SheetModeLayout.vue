<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div :class="$style.root">
	<header :class="$style.toolbar">
		<strong>{{ host.workbookTitle }}</strong>
		<button class="_textButton" @click="openEditor()">{{ i18n.ts.newNote }}</button>
		<button class="_textButton" :disabled="current.loading || !allowed(active) || !!editor" @click="load(active)">{{ i18n.ts.reload }}</button>
		<button class="_textButton" @click="leave">{{ i18n.ts._sheetMode.normal }}</button>
		<MkA :to="host.settingsPath">{{ i18n.ts._sheetMode.settings }}</MkA>
	</header>
	<p :class="$style.status" role="status">
		{{ i18n.ts._sheetMode.manualRefresh }} · {{ i18n.ts._sheetMode.updatedAt }}:
		<MkTime v-if="current.updatedAt" :time="current.updatedAt" mode="detail"/>
		<span v-else>—</span>
	</p>
	<SheetCellEditor v-if="editor && !editor.note" ref="newEditor" :key="editor.key" @close="editor = null"/>
	<div ref="grid" :class="$style.grid" @keydown="navigate">
		<p v-if="!allowed(active)">{{ i18n.ts.unavailable }}</p>
		<template v-else>
			<p v-if="current.loading" role="status">{{ i18n.ts.loading }}</p>
			<p v-if="current.error" role="alert">{{ i18n.ts.somethingHappened }} <button class="_textButton" @click="load(active)">{{ i18n.ts.retry }}</button></p>
			<SheetNotification v-if="active === 'notifications'" :key="`notifications:${current.generation}`" :notifications="notifications.items" @reply="openEditor">
				<template #default="{ rowId }"><SheetCellEditor v-if="editor?.rowId === rowId" ref="replyEditor" :key="editor.key" :note="editor.note" :seed="editor.seed" @close="editor = null"/></template>
			</SheetNotification>
			<table v-else :key="`${active}:${current.generation}`">
				<thead><tr><th></th><th>A · {{ i18n.ts.createdAt }}</th><th>B · {{ i18n.ts.account }}</th><th>C · {{ i18n.ts.note }}</th><th>D · {{ i18n.ts.reaction }}</th><th>E · {{ i18n.ts.renote }}</th><th>F · {{ i18n.ts.attachFile }}</th><th>G · {{ i18n.ts.visibility }}</th></tr></thead>
				<tbody>
					<SheetNoteRow v-for="(note, index) in timelines[active].items" :key="note.id" :note="note" :index="index" @reply="(target, seed) => openEditor(target, seed, note.id)">
						<template #default="{ note: target }"><SheetCellEditor v-if="editor?.rowId === note.id" ref="replyEditor" :key="editor.key" :note="target" :seed="editor.seed" @close="editor = null"/></template>
					</SheetNoteRow>
				</tbody>
			</table>
			<p v-if="current.initialized && !current.items.length">{{ active === 'notifications' ? i18n.ts.noNotifications : i18n.ts.noNotes }}</p>
			<button v-if="current.more" class="_textButton" :disabled="current.loading || !!editor" @click="load(active, true)">{{ i18n.ts.loadMore }}</button>
		</template>
	</div>
	<nav :class="$style.tabs" :aria-label="i18n.ts._sheetMode.title">
		<button v-for="tab in tabs" :key="tab" class="_button" :class="{ [$style.active]: active === tab }" :disabled="!allowed(tab)" :aria-current="active === tab ? 'page' : undefined" @click="select(tab)">{{ tab === 'notifications' ? i18n.ts.notifications : i18n.ts._timelines[tab] }}</button>
	</nav>
	<XCommon v-if="visible && withCommon"/>
</div>
</template>
<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef } from 'vue';
import type { entities } from 'misskey-js';
import SheetNoteRow from './SheetNoteRow.vue';
import SheetNotification from './SheetNotification.vue';
import SheetCellEditor from './SheetCellEditor.vue';
import { createSheetState, loadSheet } from './state.js';
import type { SheetState } from './state.js';
import { useSheetHost } from './host.js';
import type { SheetTimeline } from './host.js';
withDefaults(defineProps<{ visible: boolean; withCommon?: boolean }>(), { withCommon: false });
const host = useSheetHost();
const { i18n } = host;
const { Link: MkA, Time: MkTime, Common: XCommon } = host.components;
const tabs = ['home', 'local', 'social', 'global', 'notifications'] as const;
type Sheet = typeof tabs[number];
const active = ref<Sheet>('home');
const timelines = reactive(Object.fromEntries(tabs.filter(tab => tab !== 'notifications').map(tab => [tab, createSheetState<entities.Note>()])) as Record<SheetTimeline, SheetState<entities.Note>>);
const notifications = reactive(createSheetState<entities.Notification>());
const current = computed(() => active.value === 'notifications' ? notifications : timelines[active.value]);
const editor = ref<{ key: number; rowId?: string; note?: entities.Note; seed?: string } | null>(null);
const newEditor = useTemplateRef('newEditor');
const replyEditor = useTemplateRef('replyEditor');
let editorKey = 0;
let transitioning = false;

function allowed(tab: Sheet) { return tab === 'notifications' || host.isAvailableTimeline(tab); }

async function closeEditor() {
	if (!editor.value) return true;
	const instance = newEditor.value ?? (Array.isArray(replyEditor.value) ? replyEditor.value[0] : replyEditor.value);
	if (instance) return await instance.close();
	// A permission change may hide the row. MkPostForm keeps its draft.
	editor.value = null;
	return true;
}

async function openEditor(note?: entities.Note, seed?: string, rowId?: string) {
	if (transitioning || current.value.loading) return;
	if (editor.value?.note?.id === note?.id && editor.value) return;
	transitioning = true;
	try {
		if (!(await closeEditor())) return;
		editor.value = { key: ++editorKey, rowId: rowId ?? note?.id, note: note ? host.getAppearNote(note) ?? note : undefined, seed };
	} finally { transitioning = false; }
}

async function select(tab: Sheet) {
	if (!allowed(tab) || tab === active.value || transitioning) return;
	transitioning = true;
	try {
		if (!(await closeEditor())) return;
		active.value = tab;
		if (!current.value.initialized && !current.value.loading) await load(tab);
	} finally { transitioning = false; }
}

async function load(tab: Sheet, append = false) {
	if (!allowed(tab) || editor.value) return;
	if (tab === 'notifications') {
		await loadSheet(notifications, untilId => host.fetchNotifications(untilId), append);
	} else {
		await loadSheet(timelines[tab], untilId => host.fetchTimeline(tab, untilId), append);
	}
}

async function leave() {
	if (transitioning) return;
	transitioning = true;
	try {
		if (await closeEditor()) await host.leave();
	} finally { transitioning = false; }
}

function navigate(event: KeyboardEvent) {
	if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	const cell = target.tagName === 'TD' ? target : target.hasAttribute('data-sheet-input') ? target.closest('td') : null;
	if (!cell) return;
	const row = cell.parentElement as HTMLTableRowElement;
	const cells = Array.from(row.querySelectorAll<HTMLElement>(':scope > td'));
	const column = cells.indexOf(cell as HTMLElement);
	let next: HTMLElement | undefined;
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = cells[column + (event.key === 'ArrowLeft' ? -1 : 1)];
	else next = (event.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling)?.querySelectorAll<HTMLElement>(':scope > td')[column];
	if (next) { event.preventDefault(); next.focus(); }
}

void load('home');
</script>
<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	height: 100dvh;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);
	font-size: 13px;
}
.toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
	padding: 12px 16px;
	background: var(--MI_THEME-panel);
	flex-shrink: 0;

	strong { margin-right: 24px; font-size: 18px; font-weight: 500; }
	button, a { padding: 7px 10px; color: var(--MI_THEME-fg); border-radius: 4px; }
	button:hover, a:hover { background: color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); text-decoration: none; }
}
.status {
	margin: 0 12px 8px;
	padding: 9px 12px;
	border-radius: 6px;
	background: color-mix(in srgb, var(--MI_THEME-fg) 4%, var(--MI_THEME-panel));
	color: color-mix(in srgb, var(--MI_THEME-fg) 65%, var(--MI_THEME-panel));
	font-size: 12px;
}
.grid {
	overflow: auto;
	flex: 1;
	min-height: 0;
	border-top: 1px solid var(--MI_THEME-divider);
	padding-bottom: 16px;

	table { border-collapse: collapse; min-width: 100%; background: var(--MI_THEME-panel); line-height: 1.5; }
	th, td { border: 1px solid color-mix(in srgb, var(--MI_THEME-fg) 14%, var(--MI_THEME-panel)); padding: 6px 8px; vertical-align: top; min-width: 80px; }
	thead { position: sticky; top: 0; z-index: 1; }
	th { white-space: nowrap; font-size: 12px; font-weight: 400; color: color-mix(in srgb, var(--MI_THEME-fg) 75%, var(--MI_THEME-panel)); background: color-mix(in srgb, var(--MI_THEME-fg) 4%, var(--MI_THEME-panel)); }
	tbody > tr > th { min-width: 40px; width: 40px; text-align: center; }
	td a, td :global(._textButton) { color: inherit; }
	td :global(._textButton) { font-size: 12px; }
	td:focus, td:focus-within { outline: 2px solid var(--MI_THEME-link); outline-offset: -2px; }
	tr:focus-within > th { color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-link) 10%, var(--MI_THEME-panel)); }
	@for $column from 2 through 8 {
		table:has(td:nth-child(#{$column}):focus, td:nth-child(#{$column}):focus-within) thead th:nth-child(#{$column}) { color: var(--MI_THEME-fg); background: color-mix(in srgb, var(--MI_THEME-link) 10%, var(--MI_THEME-panel)); }
	}
}
.tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0;
	flex-shrink: 0;
	padding: 0 12px env(safe-area-inset-bottom);
	border-top: 1px solid var(--MI_THEME-divider);
	background: color-mix(in srgb, var(--MI_THEME-fg) 3%, var(--MI_THEME-panel));

	button { padding: 12px 20px; border-bottom: 2px solid transparent; }
	button:hover { background: color-mix(in srgb, var(--MI_THEME-fg) 5%, transparent); }
}
.active { color: var(--MI_THEME-fg); font-weight: 600; border-bottom-color: var(--MI_THEME-accent) !important; background: color-mix(in srgb, var(--MI_THEME-accent) 7%, var(--MI_THEME-panel)); }
</style>
