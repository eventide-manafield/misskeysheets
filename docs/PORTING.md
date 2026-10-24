# Misskey Spreadsheet Mode — source module

[한국어 설치·포팅 안내](PORTING.ko.md)

This is a downloadable **source module**, not an AiScript plugin or a CSS theme.
A host maintainer copies the module, adapts the host integration, and rebuilds the frontend. Once installed, users enter through a **시트모드 / Spreadsheet mode** menu item at `/sheet`.

License: AGPL-3.0-only; retain the included COPYING and SPDX notices. No Manafield service, OAuth client, account integration or new backend/schema is required.

## CLI installer

Run `sh install.sh "/path/to/host"` on Linux/macOS or `install.bat "C:\path to\host"` from Windows Command Prompt. Node.js 22+ and Git are required. Both launch the same dependency-free Node CLI. `--check` previews without writing; the default prompts before applying; `--yes` explicitly skips confirmation. Omitting the path prompts in an interactive terminal.

The host must be a clean Git source checkout. The CLI checks patch compatibility, file collisions, symlink destinations and the locale-loader shape before writing. It integrates module sources, the reference patch and translations. Unsupported forks stop for manual porting. Originals and a `manifest.json` identifying newly created files are backed up under the host Git metadata directory (`sheet-install-*`); the path is printed. Failed installation restores original file contents and removes created files; empty directories may remain. After success, review `git diff`. To undo, restore existing files from that backup and remove only new files listed in the manifest, preserving any subsequent edits first.

The CLI does not install dependencies, generate locale types, build, restart services or deploy. Complete the host checks, build and browser verification below yourself.

## Package layout

- `src/index.ts`: public entry (`SheetModule`, `SheetHost` types).
- `src/host.ts`: typed host contract and Vue provider. Missing adapters fail explicitly.
- `src/*.vue`: portable layout, rows, notifications and editor UI.
- `src/state.ts`, `src/submission.ts`: request snapshots and single-submission guard.
- `adapters/misskey.ts`: reference host adapter; version-dependent imports belong here.
- `integration/files/`: root shell, route entry and fork-owned translation loader data.
- `integration/misskey.patch`: explicit changes to the reference frontend's writer, capture, preferences, menu and routing. Review before applying; other versions may require manual porting.
- `test/unit/`: focused reference tests; run with `npm test` in this repository; the adapter fixture is independent of host globals.

The portable UI has no runtime `@/` or `@@/` imports and no Noctemblith brand literal. Its runtime dependencies are Vue, sibling module files, and an injected `SheetHost`. `misskey-js` types are a compile-time peer; labels use a module-owned structural contract. It expects the host's existing CSS theme variables and button utilities. Existing Misskey internal components are provided by the adapter, not imported by the portable UI.

## Install into the reference frontend

Work in a source checkout, not a deployed server/container filesystem. Preserve local work first. The reference patch is based on `14d4d625d` (Noctemblith); its compatibility with an arbitrary Misskey release is **not yet verified**.

1. Extract the archive (top-level directory: `misskey-spreadsheet-mode/`) or clone the repository. Run `node scripts/sync-host.mjs /absolute/path/to/host --write` from this module root. It copies `src/` to the host's `packages/frontend/src/ui/sheet/` and installs `adapters/misskey.ts` in that directory's `adapters/` subdirectory with its relative host-contract import adjusted.
2. Review `integration/misskey.patch`. From the host repository root, run `git apply --check /path/to/sheet-mode/integration/misskey.patch`. If it matches, apply it; otherwise port the listed hooks manually. Do not force a failed patch.
3. Copy each file under `integration/files/` to its corresponding repository-relative destination. The menu item is registered in `navbar.ts`, the login-required route in `router.definition.ts`, and the full-screen shell in main boot. The route page also supports secondary routers/windows without duplicating common UI.
4. Connect translations in the host i18n loader (not Crowdin-managed Korean/English YAML). Import `noctemblithSheetTranslations` from the included `noctemblith-sheet.ts`, then merge `_sheetMode` using the current language or English fallback. The reference loader does:

   ```ts
   const sheetCopy = noctemblithSheetTranslations[lang] ?? (lang === 'ja' ? undefined : noctemblithSheetTranslations.en);
   if (sheetCopy) a[key]._sheetMode = { ...sheetCopy };
   ```

   Add its import alongside existing loader imports. The patch adds the canonical Japanese keys. Regenerate the locale interface and rebuild i18n using the host's commands. Do not copy the entire Noctemblith i18n loader over another fork's loader.
5. Adapt this repository's `adapters/misskey.ts` and repeat `sync-host.mjs --write`: component paths, `useNote`, permission checks, API wrapper, settings/notification paths, locale object, router and per-account preference storage. The workbook title is configured here, using the host instance name.
6. Run frontend typecheck, changed-file lint and the focused tests, then build using the host's normal build process. Installation is complete only after actual browser checks. Deployment remains an operator decision.

## Minimal custom host integration

```vue
<template><SheetModule :host="host"/></template>
<script setup lang="ts">
import { SheetModule } from './sheet/index.js';
import { host } from './my-sheet-host.js';
</script>
```

Register this page at a login-required `/sheet` route and add a menu item with a table icon pointing to `/sheet`. For a full-screen layout, use the reference shell. `withCommon` defaults to false because a containing host layout usually already owns its popup/common host; enable it only when rendering outside that layout. Provide the router context in the host layout when required by link/popup components.

The reference menu registration supports normal menu customization and “More” menus. A fallback entry beside the home link also makes the button visible for existing accounts whose saved menu lacks the new item. Setting `sheetMode` remains an optional persistent home-screen preference; direct `/sheet` entry works even when that preference is off. Return to normal mode clears that preference and navigates home.

## Host contracts that must remain true

- **Composer** accepts `reply`, `sheet`, `compact` and `freezeAfterPosted`; emits `posted`, `cancel`, `esc`; exposes `isPosting`, `canClose`, `seedSheetText`. Compact/full UI must keep the same writer instance. `reply` must become the actual `replyId` on `notes/create`; never pass an edit note. The provided writer patch supplies this contract, account-specific draft keys, IME-safe publication, and a guard covering confirmation/upload/API awaits. An alternative writer component may implement the same contract instead.
- **Note bindings** preserve hard/soft mute and plugin filtering, existing authorized actions and the displayed target of pure renotes. `useNote` must disable streaming/polling capture in the sheet path. The reference patch adds `manualRefresh`; another fork may implement a static binding adapter without that patch. Never disable ordinary timeline streaming globally.
- **Fetch** uses limit 30 and raw `untilId` cursors. No timer, stream or automatic prepend/reorder. Backend permissions remain authoritative; disable unavailable tabs in the adapter as well.
- **Notifications** are separate entities. Resolve `fetchNotifications` only after the host's server-side read behavior completes; the included adapter uses `i/notifications` with `markAsRead: true`, whose reference implementation marks all notifications read. If another fork uses a different rule, perform its read operation before resolving or adapt the read-state renderer. Notification row IDs and related reply note IDs must stay separate.
- **Rendering** supplies safe MFM/link/account/time components, CW control and sensitive-media-aware media viewer. Do not replace these with raw HTML. `settingsPath`, `notificationsPath`, note/account paths and title are host configuration.
- **Lifecycle** initializes preferences before the root shell; direct sheet routes require authentication. Keep one common popup host. Existing normal UI, authentication, permissions and server policies must remain intact.

## Verification and compatibility

Reference tests exercise reply IDs (including pure renotes and repeated notifications), new notes, draft-preserving writer expansion, IME, Enter/arrows, pagination, stale responses, fetch/editor races, unavailable tabs and single submissions. They use a supplied test host rather than importing the production adapter, demonstrating that the UI can run against another host.

Before shipping a port, test actual posting/failure/retry, visibility/CW/sensitive media, block/mute rules, login/account switching, menu entry/return on desktop and mobile, route reload, native IME and common popup behavior. No claim of automatic compatibility with every Misskey version is made. This module reuses host internals deliberately; adapt and review the reference hooks for each fork.

## Create the archive from this repository

```sh
node scripts/package.mjs /absolute/output/misskey-spreadsheet-mode-source.tar.gz
```

The archive contains `src/`, `adapters/`, `integration/`, tests, scripts and documentation in an allowlisted source kit, not the repository, deployment configuration, credentials, databases, build caches or node_modules. Publication to a remote repository/package registry is a separate action.

When integrating with Misskey's locale inliner, pass explicit translated string leaves as shown in the reference adapter. Passing the raw I18n singleton across the host boundary fails production locale inlining.
