/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { inject, provide } from 'vue';
import type { Component, InjectionKey, Ref } from 'vue';
import type { entities } from 'misskey-js';

export type SheetTimeline = 'home' | 'local' | 'social' | 'global';
export type SheetCopy = {
	title: string; displayMode: string; description: string; normal: string; settings: string;
	manualRefresh: string; updatedAt: string; compact: string; fullComposer: string;
	discard: string; readState: string; read: string; muted: string; collapse: string;
};
export type SheetLabels = Record<
	'newNote' | 'note' | 'reload' | 'unavailable' | 'loading' | 'somethingHappened' | 'retry' |
	'createdAt' | 'account' | 'reaction' | 'renote' | 'attachFile' | 'visibility' | 'noNotifications' |
	'noNotes' | 'loadMore' | 'notifications' | 'reply' | 'close' | 'user' | 'type' |
	'details' | 'more' | 'showMore', string> & {
	_timelines: Record<SheetTimeline, string>;
	_visibility: Record<'public' | 'home' | 'followers' | 'specified', string>;
	_notification: { _types: Record<string, string> };
	_sheetMode: SheetCopy;
};
export interface SheetComposerHandle {
	isPosting(): boolean;
	canClose(): Promise<boolean>;
	seedSheetText(seed: string): void;
}
export type SheetNoteElements = {
	reactButton?: Ref<HTMLElement | null>;
	renoteButton?: Ref<HTMLElement | null>;
	menuButton?: Ref<HTMLElement | null>;
};
export interface SheetNoteBindings {
	appearNote: entities.Note;
	$appearNote: { reactionCount: number };
	muted: Ref<unknown>;
	hardMuted: unknown;
	hideByPlugin: boolean;
	showContent: Ref<boolean>;
	canRenote: boolean;
	renote(): unknown;
	toggleReact(): unknown;
	showMenu(): unknown;
}
/** The only connection the portable UI needs to its host frontend. */
export interface SheetHost {
	workbookTitle: string;
	i18n: { ts: SheetLabels };
	settingsPath: string;
	notificationsPath: string;
	notePage(id: string): string;
	userPage(user: entities.UserLite): string;
	getAppearNote(note: entities.Note): entities.Note | null | undefined;
	isAvailableTimeline(timeline: SheetTimeline): boolean;
	fetchTimeline(timeline: SheetTimeline, untilId?: string): Promise<entities.Note[]>;
	/** Resolve only after server-side read handling succeeds. */
	fetchNotifications(untilId?: string): Promise<entities.Notification[]>;
	useNote(note: entities.Note, elements?: SheetNoteElements): SheetNoteBindings;
	confirmClose(): Promise<boolean>;
	leave(): void | Promise<void>;
	components: { Link: Component; Account: Component; Time: Component; Mfm: Component; Composer: Component; CwButton: Component; MediaList: Component; Common: Component };
}
const SHEET_HOST: InjectionKey<SheetHost> = Symbol('spreadsheet-host');
export function provideSheetHost(host: SheetHost) { provide(SHEET_HOST, host); }
export function useSheetHost(): SheetHost {
	const host = inject(SHEET_HOST);
	if (!host) throw new Error('Spreadsheet mode requires a SheetHost provider.');
	return host;
}
