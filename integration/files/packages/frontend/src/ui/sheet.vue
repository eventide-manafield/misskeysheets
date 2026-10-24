<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<SheetModule v-if="state.mounted" v-show="state.visible" :host="misskeySheetHost" :visible="state.visible" withCommon/>
<component :is="normalLayout" v-if="!state.visible"/>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { SheetModule } from '@/ui/sheet/index.js';
import { sheetShellState } from '@/ui/sheet/navigation.js';
import { misskeySheetHost } from '@/ui/sheet/adapters/misskey.js';
import { prefer } from '@/preferences.js';
import { mainRouter } from '@/router.js';
import { $i } from '@/i.js';
defineProps<{ normalLayout: Component }>();
const state = computed(() => sheetShellState($i != null, prefer.s.sheetMode, mainRouter.currentRoute.value.name));
</script>
