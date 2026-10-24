/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
// Version-specific imports stay in this adapter, outside the portable UI.
import { instanceName } from '@@/js/config.js';
import type { SheetHost } from '../src/host.js';
import { useNote } from '@/composables/use-note.js';
import { isAvailableBasicTimeline } from '@/timelines.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { prefer } from '@/preferences.js';
import { mainRouter } from '@/router.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { userPage } from '@/filters/user.js';
import { getAppearNote } from '@/utility/get-appear-note.js';
import MkA from '@/components/global/MkA.vue';
import MkAcct from '@/components/global/MkAcct.vue';
import MkTime from '@/components/global/MkTime.vue';
import Mfm from '@/components/global/MkMfm.js';
import MkPostForm from '@/components/MkPostForm.vue';
import MkCwButton from '@/components/MkCwButton.vue';
import MkMediaList from '@/components/MkMediaList.vue';
import XCommon from '@/ui/_common_/common.vue';

// Pass translated strings, not the I18n singleton, through the portable boundary.
// Misskey's locale inliner requires explicit string-leaf accesses.
const sheetLabels = {
	newNote: i18n.ts.newNote,
	note: i18n.ts.note,
	reload: i18n.ts.reload,
	unavailable: i18n.ts.unavailable,
	loading: i18n.ts.loading,
	somethingHappened: i18n.ts.somethingHappened,
	retry: i18n.ts.retry,
	createdAt: i18n.ts.createdAt,
	account: i18n.ts.account,
	reaction: i18n.ts.reaction,
	renote: i18n.ts.renote,
	attachFile: i18n.ts.attachFile,
	visibility: i18n.ts.visibility,
	noNotifications: i18n.ts.noNotifications,
	noNotes: i18n.ts.noNotes,
	loadMore: i18n.ts.loadMore,
	notifications: i18n.ts.notifications,
	reply: i18n.ts.reply,
	close: i18n.ts.close,
	user: i18n.ts.user,
	type: i18n.ts.type,
	details: i18n.ts.details,
	more: i18n.ts.more,
	showMore: i18n.ts.showMore,
	_timelines: {
		home: i18n.ts._timelines.home,
		local: i18n.ts._timelines.local,
		social: i18n.ts._timelines.social,
		global: i18n.ts._timelines.global,
	},
	_visibility: {
		public: i18n.ts._visibility.public,
		publicDescription: i18n.ts._visibility.publicDescription,
		home: i18n.ts._visibility.home,
		homeDescription: i18n.ts._visibility.homeDescription,
		followers: i18n.ts._visibility.followers,
		followersDescription: i18n.ts._visibility.followersDescription,
		specified: i18n.ts._visibility.specified,
		specifiedDescription: i18n.ts._visibility.specifiedDescription,
		disableFederation: i18n.ts._visibility.disableFederation,
		disableFederationDescription: i18n.ts._visibility.disableFederationDescription,
	},
	_notification: { _types: {
		all: i18n.ts._notification._types.all,
		note: i18n.ts._notification._types.note,
		follow: i18n.ts._notification._types.follow,
		mention: i18n.ts._notification._types.mention,
		reply: i18n.ts._notification._types.reply,
		renote: i18n.ts._notification._types.renote,
		quote: i18n.ts._notification._types.quote,
		reaction: i18n.ts._notification._types.reaction,
		pollEnded: i18n.ts._notification._types.pollEnded,
		scheduledNotePosted: i18n.ts._notification._types.scheduledNotePosted,
		scheduledNotePostFailed: i18n.ts._notification._types.scheduledNotePostFailed,
		receiveFollowRequest: i18n.ts._notification._types.receiveFollowRequest,
		followRequestAccepted: i18n.ts._notification._types.followRequestAccepted,
		roleAssigned: i18n.ts._notification._types.roleAssigned,
		chatRoomInvitationReceived: i18n.ts._notification._types.chatRoomInvitationReceived,
		achievementEarned: i18n.ts._notification._types.achievementEarned,
		exportCompleted: i18n.ts._notification._types.exportCompleted,
		login: i18n.ts._notification._types.login,
		createToken: i18n.ts._notification._types.createToken,
		test: i18n.ts._notification._types.test,
		app: i18n.ts._notification._types.app,
	} },
	_sheetMode: {
		title: i18n.ts._sheetMode.title,
		displayMode: i18n.ts._sheetMode.displayMode,
		description: i18n.ts._sheetMode.description,
		normal: i18n.ts._sheetMode.normal,
		settings: i18n.ts._sheetMode.settings,
		manualRefresh: i18n.ts._sheetMode.manualRefresh,
		updatedAt: i18n.ts._sheetMode.updatedAt,
		compact: i18n.ts._sheetMode.compact,
		fullComposer: i18n.ts._sheetMode.fullComposer,
		discard: i18n.ts._sheetMode.discard,
		readState: i18n.ts._sheetMode.readState,
		read: i18n.ts._sheetMode.read,
		muted: i18n.ts._sheetMode.muted,
		collapse: i18n.ts._sheetMode.collapse,
	},
};

const endpoints = { home: 'notes/timeline', local: 'notes/local-timeline', social: 'notes/hybrid-timeline', global: 'notes/global-timeline' } as const;
export function createMisskeySheetHost(navigateHome: () => void = () => mainRouter.push('/')): SheetHost {
	return {
		workbookTitle: `${instanceName} — Book1`,
		i18n: { ts: sheetLabels },
		settingsPath: '/settings/preferences',
		notificationsPath: '/my/notifications',
		notePage: id => `/notes/${id}`,
		userPage,
		getAppearNote,
		isAvailableTimeline: isAvailableBasicTimeline,
		fetchTimeline: (timeline, untilId) => misskeyApi(endpoints[timeline], { limit: 30, untilId }),
		fetchNotifications: untilId => misskeyApi('i/notifications', { limit: 30, untilId, markAsRead: true }),
		useNote: (note, elements) => useNote({ note, withHardMute: true }, elements, { manualRefresh: true }),
		confirmClose: async () => !(await os.confirm({ type: 'question', text: i18n.ts._sheetMode.discard })).canceled,
		leave: () => { prefer.commit('sheetMode', false); navigateHome(); },
		components: { Link: MkA, Account: MkAcct, Time: MkTime, Mfm, Composer: MkPostForm, CwButton: MkCwButton, MediaList: MkMediaList, Common: XCommon },
	};
}

export const misskeySheetHost = createMisskeySheetHost();
