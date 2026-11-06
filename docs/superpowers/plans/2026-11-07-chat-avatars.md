# Chat avatars plan

Spec: ../specs/2026-11-07-chat-avatars.md

1. Add regression tests to ChatUsability.test.jsx for sender avatars/profile/fallback; confirm failure before implementation.
2. Add ChatAvatar.tsx with URL fallback and final role icon; wire shared ChatField with current auth user; add shrink-safe chat.css avatar row styles.
3. Run frontend tests, lint, scoped Prettier, build and Agent mobile E2E. Preserve uncommitted vision work; do not commit.

## Verification

Implemented. Commands from frontend:

- `pnpm test`: 257 tests passed before adding two standalone avatar tests; subsequent `pnpm exec vitest run src/features/tasks/components/test/ChatUsability.test.jsx src/features/tasks/components/test/ChatAvatar.test.tsx`: 8 passed.
- `AGENT_UI_AUDIT_DIR=/tmp/orbit-avatar-audit pnpm exec playwright test e2e/agent-workspace.spec.ts e2e/agent-design-audit.spec.ts --workers=2`: four audit walkthroughs passed; found pre-existing English locator mismatch (placeholder versus aria-label). Fixed selector; `pnpm exec playwright test e2e/agent-workspace.spec.ts --workers=2`: all seven passed.
- `pnpm run lint`, `pnpm run build`, scoped Prettier check on changed avatar/message/style/test files.
- Inspected screenshot at docs/ui-audit/2026-11-07-chat-avatars/mobile.png: avatars loaded from supplied URL; mobile chat stays in viewport.
- Existing warnings: jsdom navigation warning in full unit suite and Vite large bundle warning. No backend changes for this feature. Existing uncommitted vision work preserved.
