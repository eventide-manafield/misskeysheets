/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import type { App } from 'vue';
import type { entities } from 'misskey-js';
import SheetModule from '../../src/SheetModule.vue';
import type { SheetHost } from '../../src/host.js';
import labels from '../fixtures/labels.json';
const i18n = { ts: labels };
const misskeyApi = vi.fn();
const useNote = ({ note }: { note: entities.Note }) => ({
 appearNote: note.renote ?? note, $appearNote: { reactionCount: 0 }, muted: ref(false), hardMuted: false,
 hideByPlugin: false, showContent: ref(false), canRenote: true, renote: vi.fn(), toggleReact: vi.fn(), showMenu: vi.fn(),
});
const Composer = defineComponent({
 props: ['reply', 'compact'],
 setup: (props, { expose }) => {
  expose({ isPosting: () => false, canClose: async () => true, seedSheetText: vi.fn() });
  return () => h('textarea', { 'data-reply': props.reply?.id ?? '', 'data-compact': props.compact });
 },
});
let app: App | undefined;
let element: HTMLDivElement;
let lastHost: SheetHost;
afterEach(() => { app?.unmount(); element?.remove(); vi.clearAllMocks(); });
const original = { id: 'original', userId: 'someone', createdAt: new Date().toISOString(), user: { id: 'someone', username: 'someone' }, text: 'body', files: [], visibility: 'public', reactions: {}, renoteCount: 0 } as unknown as entities.Note;

async function mount(items: entities.Note[]) {
	vi.mocked(misskeyApi).mockResolvedValue(items as never);
	element = document.createElement('div'); document.body.appendChild(element);
	const stub = defineComponent({ setup: (_, { slots }) => () => h('span', slots.default?.()) });
	const host: SheetHost = {
		workbookTitle: 'Test host — Book1', i18n, settingsPath: '/settings', notificationsPath: '/notifications',
		notePage: id => `/notes/${id}`, userPage: user => `/@${user.username}`, getAppearNote: note => note.renote ?? note,
		isAvailableTimeline: type => type !== 'global',
		fetchTimeline: (type, untilId) => misskeyApi(({ home: 'notes/timeline', local: 'notes/local-timeline', social: 'notes/hybrid-timeline', global: 'notes/global-timeline' } as const)[type], { limit: 30, untilId }),
		fetchNotifications: untilId => misskeyApi('i/notifications', { limit: 30, untilId, markAsRead: true }),
		useNote: note => useNote({ note }), confirmClose: async () => true, leave: vi.fn(),
		components: { Link: stub, Account: stub, Time: stub, Mfm: stub, Composer, CwButton: stub, MediaList: stub, Common: stub },
	};
	lastHost = host;
	app = createApp(SheetModule, { host });
	app.mount(element);
	await vi.waitFor(() => expect(element.querySelector('tbody tr')).not.toBeNull());
	return element;
}

function clickText(text: string) {
	const button = Array.from(element.querySelectorAll('button')).find(button => button.textContent?.includes(text));
	expect(button).toBeDefined(); button!.click();
}

describe('sheet reply identity and navigation', () => {
	it('uses the supplied host branding and normal-mode navigation', async () => {
		await mount([original]);
		expect(element.textContent).toContain('Test host — Book1');
		(element.querySelectorAll('header button')[2] as HTMLButtonElement).click();
		await vi.waitFor(() => expect(lastHost.leave).toHaveBeenCalledOnce());
	});
	it('retains the editor and cancels navigation when the host rejects closure', async () => {
		await mount([original]);
		lastHost.confirmClose = vi.fn(async () => false);
		element.querySelector('tbody td:nth-of-type(3)')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		await vi.waitFor(() => expect(element.querySelector('textarea[data-reply]')).not.toBeNull());
		(element.querySelectorAll('header button')[2] as HTMLButtonElement).click();
		await vi.waitFor(() => expect(lastHost.confirmClose).toHaveBeenCalledOnce());
		expect(lastHost.leave).not.toHaveBeenCalled();
		expect(element.querySelector('textarea[data-reply]')).not.toBeNull();
	});
	it('replies to the original note from a pure-renote row and keeps one editor', async () => {
		await mount([{ ...original, id: 'wrapper', text: null, renoteId: original.id, renote: original }]);
		const cell = element.querySelector('tbody td:nth-of-type(3)')!;
		cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		await vi.waitFor(() => expect(element.querySelector('textarea[data-reply]')?.getAttribute('data-reply')).toBe('original'));
		expect(element.querySelectorAll('textarea[data-reply]')).toHaveLength(1);
		clickText('All composer options'); await nextTick();
		expect(element.querySelector('textarea[data-reply]')?.getAttribute('data-reply')).toBe('original');
		expect(element.querySelector('textarea[data-reply]')?.getAttribute('data-compact')).toBe('false');
	});
	it('keeps Korean IME composition intact before starting the reply', async () => {
		await mount([original]);
		const input = element.querySelector('textarea[data-sheet-input]') as HTMLTextAreaElement;
		input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
		input.value = '안녕';
		input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
		await nextTick();
		expect(element.querySelector('textarea[data-reply]')).toBeNull();
		input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '안녕' }));
		await vi.waitFor(() => expect(element.querySelector('textarea[data-reply]')?.getAttribute('data-reply')).toBe('original'));
		expect(input.value).toBe('');
	});
	it('opens a new note without a reply and ignores Enter and movement as posting triggers', async () => {
		await mount([original]);
		const cell = element.querySelector('tbody td:nth-of-type(3)')!;
		for (const key of ['Enter', 'ArrowDown']) cell.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
		await nextTick(); expect(element.querySelector('textarea[data-reply]')).toBeNull();
		(element.querySelector('header button') as HTMLButtonElement).click();
		await vi.waitFor(() => expect(element.querySelector('textarea[data-reply]')).not.toBeNull());
		expect(element.querySelector('textarea[data-reply]')?.getAttribute('data-reply')).toBe('');
		expect(vi.mocked(misskeyApi).mock.calls.map(call => call[0])).toEqual(['notes/timeline']);
	});
	it('keeps visited sheet snapshots and disables forbidden timelines', async () => {
		await mount([original]);
		clickText('Local'); await vi.waitFor(() => expect(misskeyApi).toHaveBeenCalledTimes(2));
		clickText('Home'); await nextTick();
		expect(misskeyApi).toHaveBeenCalledTimes(2);
		const global = Array.from(element.querySelectorAll('nav button')).find(button => button.textContent === 'Global') as HTMLButtonElement;
		expect(global.disabled).toBe(true);
	});
	it('uses the related note and mounts one editor for repeated notifications', async () => {
		await mount([original]);
		vi.mocked(misskeyApi).mockResolvedValueOnce([
			{ id: 'notification-a', type: 'reply', createdAt: original.createdAt, user: original.user, note: original },
			{ id: 'notification-b', type: 'reply', createdAt: original.createdAt, user: original.user, note: original },
		] as never);
		clickText('Notifications');
		await vi.waitFor(() => expect(element.querySelectorAll('[data-notification-id]')).toHaveLength(2));
		clickText('↳');
		await vi.waitFor(() => expect(element.querySelectorAll('textarea[data-reply]')).toHaveLength(1));
		expect(element.querySelector('textarea[data-reply]')?.getAttribute('data-reply')).toBe('original');
		expect(misskeyApi).toHaveBeenLastCalledWith('i/notifications', { limit: 30, untilId: undefined, markAsRead: true });
	});
	it('does not open an editor on a row being replaced by a refresh', async () => {
		await mount([original]);
		let complete!: (items: entities.Note[]) => void;
		vi.mocked(misskeyApi).mockImplementationOnce(() => new Promise(resolve => { complete = resolve as typeof complete; }) as never);
		(element.querySelectorAll('header button')[1] as HTMLButtonElement).click(); await nextTick();
		element.querySelector('tbody td:nth-of-type(3)')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		await nextTick(); expect(element.querySelector('textarea[data-reply]')).toBeNull();
		complete([]); await nextTick();
	});
});
