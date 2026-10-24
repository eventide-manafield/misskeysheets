<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<tr v-if="!hardMuted && !hideByPlugin" :data-note-id="note.id" :data-target-note-id="appearNote.id">
	<th scope="row">{{ index + 1 }}</th>
	<td tabindex="0"><MkA :to="host.notePage(appearNote.id)"><MkTime :time="note.createdAt" mode="detail"/></MkA></td>
	<td tabindex="0"><MkA :to="host.userPage(appearNote.user)"><MkAcct :user="appearNote.user"/></MkA></td>
	<td tabindex="0" :class="$style.body" @dblclick="startReply()" @focus.self="captureInput?.focus()">
		<textarea ref="captureInput" :class="$style.inputCapture" tabindex="-1" data-sheet-input :aria-label="i18n.ts.reply" @keydown="captureKey" @input="captureText" @compositionstart="composing = true" @compositionend="composing = false; captureText()"></textarea>
		<SheetNoteBody v-model:revealed="showContent" :note="note" @reveal="muted = false"/>
		<button class="_textButton" :disabled="muted !== false" @click="startReply()">↳ {{ i18n.ts.reply }}</button>
		<slot :note="appearNote"></slot>
	</td>
	<td tabindex="0"><button ref="reactButton" class="_textButton" @click="toggleReact()">{{ i18n.ts.reaction }} · {{ $appearNote.reactionCount }}</button></td>
	<td tabindex="0"><button ref="renoteButton" class="_textButton" :disabled="!canRenote" @click="renote()">{{ i18n.ts.renote }} · {{ appearNote.renoteCount }}</button></td>
	<td tabindex="0">
		<button v-if="(appearNote.files?.length ?? 0)" class="_textButton" :disabled="muted !== false || (appearNote.cw != null && !showContent)" @click="media = !media">{{ i18n.ts.attachFile }} · {{ (appearNote.files?.length ?? 0) }}</button>
		<MkMediaList v-if="media && muted === false && (appearNote.cw == null || showContent)" :mediaList="appearNote.files ?? []"/>
	</td>
	<td tabindex="0">{{ i18n.ts._visibility[appearNote.visibility] }} <button ref="menuButton" class="_textButton" :aria-label="i18n.ts.more" @click="showMenu()"><i class="ti ti-dots"></i></button></td>
</tr>
</template>
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { entities } from 'misskey-js';
import SheetNoteBody from './SheetNoteBody.vue';
import { useSheetHost } from './host.js';
const host = useSheetHost();
const { i18n } = host;
const { Link: MkA, Account: MkAcct, Time: MkTime, MediaList: MkMediaList } = host.components;
const props = defineProps<{ note: entities.Note; index: number }>();
const emit = defineEmits<{ (event: 'reply', note: entities.Note, seed?: string): void }>();
const reactButton = useTemplateRef('reactButton');
const renoteButton = useTemplateRef('renoteButton');
const menuButton = useTemplateRef('menuButton');
const { appearNote, $appearNote, showContent, muted, hardMuted, hideByPlugin, canRenote, renote, toggleReact, showMenu } = host.useNote(props.note, { reactButton, renoteButton, menuButton });
const media = ref(false);
const captureInput = useTemplateRef('captureInput');
const composing = ref(false);

function startReply(seed?: string) {
	if (muted.value === false) emit('reply', appearNote, seed);
}

function captureText() {
	if (composing.value || !captureInput.value?.value) return;
	const seed = captureInput.value.value;
	captureInput.value.value = '';
	startReply(seed);
}

function captureKey(event: KeyboardEvent) {
	if (composing.value || event.isComposing) { event.stopPropagation(); return; }
	if (event.key.startsWith('Arrow')) return;
	event.stopPropagation();
	if (event.key === 'Enter') event.preventDefault();
}

</script>
<style lang="scss" module>
.inputCapture { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.body { position: relative; min-width: 320px; max-width: 600px; overflow-wrap: anywhere; }
</style>
