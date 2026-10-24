<!--
SPDX-FileCopyrightText: Noctemblith contributors
SPDX-License-Identifier: AGPL-3.0-only
-->
<template><SheetModule :host="host"/></template>
<script setup lang="ts">
import { SheetModule } from '@/ui/sheet/index.js';
import { createMisskeySheetHost } from '@/ui/sheet/adapters/misskey.js';
import { useRouter } from '@/router.js';
const router = useRouter();
const host = createMisskeySheetHost(() => router.push('/'));
</script>
