<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div v-if="!hardMuted && !hideByPlugin">
	<button v-if="muted !== false" class="_textButton" @click="muted = false; emit('reveal')">{{ i18n.ts._sheetMode.muted }}</button>
	<template v-else>
		<template v-if="appearNote.cw != null">
			<Mfm :text="appearNote.cw" :author="appearNote.user"/>
			<MkCwButton v-model="showContent" :text="appearNote.text" :renote="appearNote.renote" :files="appearNote.files" :poll="appearNote.poll"/>
		</template>
		<template v-if="appearNote.cw == null || showContent">
			<div :class="{ [$style.clipped]: !expanded }">
				<Mfm v-if="appearNote.text" :text="appearNote.text" :author="appearNote.user" :nyaize="'respect'" :emojiUrls="appearNote.emojis"/>
			</div>
			<button v-if="appearNote.text" class="_textButton" @click="expanded = !expanded">{{ expanded ? i18n.ts._sheetMode.collapse : i18n.ts.showMore }}</button>
			<MkA v-if="appearNote.renoteId || appearNote.poll" :to="host.notePage(appearNote.id)">{{ i18n.ts.details }}</MkA>
		</template>
		<button v-if="replyButton" class="_textButton" @click="emit('reply', appearNote)">↳ {{ i18n.ts.reply }}</button>
	</template>
</div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import type { entities } from 'misskey-js';
import { useSheetHost } from './host.js';
const host = useSheetHost();
const { i18n } = host;
const { Link: MkA, Mfm, CwButton: MkCwButton } = host.components;
const props = defineProps<{ note: entities.Note; replyButton?: boolean }>();
const emit = defineEmits<{ (event: 'reply', note: entities.Note): void; (event: 'reveal'): void }>();
const showContent = defineModel<boolean>('revealed', { default: false });
const { appearNote, hardMuted, muted, hideByPlugin } = host.useNote(props.note);
const expanded = ref(false);
</script>
<style lang="scss" module>
.clipped { max-height: 4.5em; overflow: hidden; }
</style>
