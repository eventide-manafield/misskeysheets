<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<table>
	<thead><tr><th></th><th>A · {{ i18n.ts.createdAt }}</th><th>B · {{ i18n.ts.user }}</th><th>C · {{ i18n.ts.type }}</th><th>D · {{ i18n.ts.note }}</th><th>E · {{ i18n.ts._sheetMode.readState }}</th></tr></thead>
	<tbody>
		<tr v-for="(notification, index) in notifications" :key="notification.id" :data-notification-id="notification.id">
			<th scope="row">{{ index + 1 }}</th>
			<td tabindex="0"><MkTime :time="notification.createdAt" mode="detail"/></td>
			<td tabindex="0"><MkA v-if="'user' in notification" :to="host.userPage(notification.user)"><MkAcct :user="notification.user"/></MkA></td>
			<td tabindex="0">{{ notificationType(notification.type) }}</td>
			<td tabindex="0">
				<template v-if="'note' in notification">
					<MkA :to="host.notePage(notification.note.id)">{{ i18n.ts.details }}</MkA>
					<SheetNoteBody :note="notification.note" replyButton @reply="note => emit('reply', note, undefined, notification.id)"/>
					<slot :note="notification.note" :rowId="notification.id"></slot>
				</template>
				<MkA v-else :to="host.notificationsPath">{{ i18n.ts.details }}</MkA>
			</td>
			<td tabindex="0">{{ i18n.ts._sheetMode.read }}</td>
		</tr>
	</tbody>
</table>
</template>
<script setup lang="ts">
import type { entities } from 'misskey-js';
import SheetNoteBody from './SheetNoteBody.vue';
import { useSheetHost } from './host.js';
const host = useSheetHost();
const { i18n } = host;
const { Link: MkA, Account: MkAcct, Time: MkTime } = host.components;
defineProps<{ notifications: entities.Notification[] }>();

function notificationType(type: entities.Notification['type']) {
	if (type === 'reaction:grouped') return i18n.ts._notification._types.reaction;
	if (type === 'renote:grouped') return i18n.ts._notification._types.renote;
	return i18n.ts._notification._types[type];
}

const emit = defineEmits<{ (event: 'reply', note: entities.Note, seed: undefined, rowId: string): void }>();
</script>
