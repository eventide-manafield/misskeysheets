# Spreadsheet module

- `src/` is portable UI. Do not import host frontend aliases, routing, authentication, API singletons or brand names there.
- Keep version-specific imports in `adapters/`. Preserve host authorization, mute/CW/sensitive-media and writer semantics.
- Entering text on existing notes creates replies, never edits. Keep row identity separate from reply target identity.
- No automatic timeline prepend/reorder/polling. Do not change the host realtime setting.
- Use the existing focused tests, `npm run typecheck` and `npm run build`. Do not add visual pass/fail gates.
- No credentials, deployment config secrets, node_modules or generated bundles in Git.
- Do not deploy, publish, push or create remote repositories unless explicitly authorized in the conversation.
