<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<SheetModeLayout :visible="visible" :withCommon="withCommon"/>
</template>
<script setup lang="ts">
import SheetModeLayout from './SheetModeLayout.vue';
import { provideSheetHost } from './host.js';
import type { SheetHost } from './host.js';
const props = withDefaults(defineProps<{ host: SheetHost; visible?: boolean; withCommon?: boolean }>(), { visible: true, withCommon: false });
provideSheetHost(props.host);
</script>
