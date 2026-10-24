<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.editor">
	<header>
		<span v-if="note">↳ {{ i18n.ts.reply }} <MkAcct :user="note.user"/> · <MkA :to="host.notePage(note.id)">{{ note.id }}</MkA></span>
		<span v-else>{{ i18n.ts.note }}</span>
		<button class="_textButton" @click="expanded = !expanded">{{ expanded ? i18n.ts._sheetMode.compact : i18n.ts._sheetMode.fullComposer }}</button>
		<button class="_textButton" @click="close">{{ i18n.ts.close }}</button>
	</header>
	<MkPostForm ref="form" :reply="note" :sheet="true" :compact="!expanded" :freezeAfterPosted="true" @posted="emit('close')" @cancel="close" @esc="close"/>
</section>
</template>
<script setup lang="ts">
import { ref, useTemplateRef, onMounted, nextTick } from 'vue';
import type { entities } from 'misskey-js';
import { useSheetHost } from './host.js';
import type { SheetComposerHandle } from './host.js';
const host = useSheetHost();
const { i18n } = host;
const { Link: MkA, Account: MkAcct, Composer: MkPostForm } = host.components;
const props = defineProps<{ note?: entities.Note; seed?: string }>();
const emit = defineEmits<{ (event: 'close'): void }>();
const form = useTemplateRef<SheetComposerHandle>('form');
const expanded = ref(false);
let closing = false;

async function close() {
	if (closing || form.value?.isPosting()) return false;
	closing = true;
	try {
		const accepted = await host.confirmClose();
		if (!accepted || !(await form.value?.canClose())) return false;
		emit('close');
		return true;
	} finally {
		closing = false;
	}
}

onMounted(async () => {
	// MkPostForm restores its per-account, per-reply draft on the next tick.
	await nextTick();
	if (props.seed) form.value?.seedSheetText(props.seed);
});
defineExpose({ close });
</script>
<style lang="scss" module>
.editor { border: 1px solid var(--MI_THEME-link); background: var(--MI_THEME-panel); min-width: 0; }
.editor > header { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px; }
</style>
