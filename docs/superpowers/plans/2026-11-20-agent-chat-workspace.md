# Agent Chat Workspace Implementation Plan

**Goal** — Bring the reference chat layout to Orbit V2 and open blank chats by default in both versions.

**Architecture** — Keep the shared Agent session and its draft protection. Use URL selection for conversations and new-chat project scope. Reuse the project context already persisted on conversations.

**Tech stack** — React, React Router, Tailwind, Express, Mongoose, Vitest and Playwright.

**Spec** — [Agent chat workspace](../specs/2026-11-20-agent-chat-workspace.md)

1. Add red Playwright cases in `frontend/e2e/agent-chat-workspace.spec.ts` for blank entry in both versions, opening an existing chat and returning to Agent, and creating the first conversation from the Projects panel. Add backend cases for project validation and rejecting unowned projects.
2. Update `aiValidation.ts`, `aiController.ts`, `conversationService.ts` and `conversationRepository.ts` to accept an owned project at creation and publish context IDs in chat summaries. Keep old requests and data compatible.
3. Update `AgentSessionProvider.tsx`, `useAgentNavigation.ts`, `useConversationSession.ts` and `useConversationChat.ts` for lazy creation, route synchronization and explicit bubble handoff. Exercise both Agent routes and draft protection.
4. Rework `AgentsPage.tsx` and add the V2 project sidebar. Extend the shared ChatField with an opt-in workspace composer, use existing Orbit tokens and project form, and update English and Vietnamese labels. Exercise desktop, tablet, 320 px and 390 px mobile in light and dark themes. Capture and review screenshots of empty, project, and active chat states.
5. Run backend `pnpm test --maxWorkers=2`, `pnpm run lint`, `pnpm run format:check`, `pnpm run build`, and frontend `pnpm test --maxWorkers=2`, `pnpm run test:e2e --workers=2`, `pnpm run lint`, `pnpm run format:check`, `pnpm run build`. Review the final diff and report baseline gaps separately from change verification.

## Verification record

Commands run from `frontend/`.

```sh
pnpm test --maxWorkers=2
pnpm run lint
pnpm run format:check
pnpm run build
pnpm exec playwright test agent-chat-workspace.spec.ts agent-workspace.spec.ts agent-time-web-search.spec.ts v2-agents-review.spec.ts v2-workspace-layout.spec.ts frontend-v2-polish.spec.ts v2-glass-consistency.spec.ts chat-attachments.spec.ts chat-streaming.spec.ts chat-usability.spec.ts v2-chat-two-modes.spec.ts personal-skills.spec.ts --workers=2 --output=/tmp/orbit-agent-final-results
pnpm exec playwright test --config playwright.v2-production.config.ts --output=/tmp/orbit-agent-production-results
AGENT_UI_AUDIT_DIR=/tmp/orbit-chat-review/v1 pnpm run test:e2e --workers=2 --grep-invert 'Frontend V2 Production Bundles and Chunk Boundaries'
```

Commands run from `backend/`.

```sh
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27127/ pnpm test --maxWorkers=2
pnpm run lint
pnpm run format:check
pnpm run build
```

Prettier was also run against all changed package files with `pnpm exec prettier --check`. ESLint was run against the changed backend files with `pnpm exec eslint`. `git diff --check` was run from the repository root.

The browser run uses simulated API responses in Chromium. The backend run uses a disposable MongoDB replica set and includes an HTTP integration case for ownership, first-turn project context, idempotent creation, and history listing. The visual review covered V1 and V2, 320, 390, 768 and 1440 px, light and dark themes, and Vietnamese labels. The reviewed states included blank chat, Projects, an active conversation, keyboard focus, and the assistant handoff.

- Final Agent and related Chromium regressions passed 98/98. Production preview passed 3/3.
- Frontend Vitest passed 561/561. Backend Vitest passed 701/701 against the disposable replica set.
- Frontend lint, both builds, changed-file formatting, and changed-file backend lint passed. Vite reported existing large-chunk and mixed-import warnings.
- The earlier broad Chromium run passed 225/227. The V1 Statistics test for ranges, themes and mobile layout also failed on the original revision. The Mermaid loading case passed in the final regression run after rebuilding the local Vite dependency cache. A calendar pointer-resize case also failed once on the original revision and passed in the later broad run.
- The full backend lint command reports an unused import in `services/test/chatStreamBus.test.ts`. The full frontend and backend format commands report 10 and 8 files respectively, all outside the patch.

## Sidebar and composer follow-up

The V2 review confirmed that All projects clears a selected project and opens a blank general chat after any required draft confirmation. Chromium exercised the shared glass-pill styling, the visible composer tools, and Stop occupying the Send slot during streaming and cancellation. Browser checks used API fixtures.

Run from `frontend/`.

```sh
pnpm exec playwright test agent-chat-workspace.spec.ts agent-workspace.spec.ts agent-time-web-search.spec.ts v2-agents-review.spec.ts v2-workspace-layout.spec.ts frontend-v2-polish.spec.ts v2-glass-consistency.spec.ts chat-attachments.spec.ts chat-streaming.spec.ts chat-usability.spec.ts v2-chat-two-modes.spec.ts personal-skills.spec.ts --workers=2 --output=/tmp/orbit-agent-feedback-final
pnpm exec playwright test chat-streaming.spec.ts --grep 'single Stop' --workers=1 --output=/tmp/orbit-agent-feedback-stop
pnpm exec playwright test --config playwright.v2-production.config.ts --output=/tmp/orbit-agent-feedback-production
pnpm test --maxWorkers=2
pnpm run lint
pnpm exec prettier --check e2e/{agent-chat-workspace,chat-streaming,v2-agents-review}.spec.ts src/features/agent/AgentContextPanel.tsx src/features/tasks/components/chat/{ChatField,ChatToolbar}.jsx src/features/v2/{pages/AgentsPage,components/AgentProjectSidebar,test/AgentsPage.test}.tsx src/shared/i18n/locales/{en,vi}/{agent,v2}.json src/styles/index.css
pnpm run build
```

All 100 Chromium regression checks, the isolated mobile Stop check, and all 3 production preview checks passed. Frontend Vitest passed 561/561. Lint, changed-file formatting and the frontend build passed. Vite still reports existing chunk size warnings.

## Active conversation layout follow-up

The active V2 conversation uses the available width for the message rows and composer. Chromium measured the composer and a reply row against the conversation pane at 1440 px, checked 16 px reply text, and exercised long content and the Send control on mobile. The browser runs used API fixtures.

Commands from `frontend/`.

```sh
pnpm exec playwright test agent-chat-workspace.spec.ts agent-workspace.spec.ts agent-time-web-search.spec.ts v2-agents-review.spec.ts v2-workspace-layout.spec.ts frontend-v2-polish.spec.ts v2-glass-consistency.spec.ts chat-attachments.spec.ts chat-streaming.spec.ts chat-usability.spec.ts v2-chat-two-modes.spec.ts personal-skills.spec.ts --workers=2 --output=/tmp/orbit-agent-spacious-final
pnpm test --maxWorkers=2
pnpm run lint
pnpm exec prettier --check e2e/v2-agents-review.spec.ts src/features/tasks/components/chat/ChatField.jsx src/features/v2/pages/AgentsPage.tsx src/styles/index.css
pnpm run build
```

Playwright passed 101/101 and Vitest passed 561/561. Frontend lint, formatting on the changed files and the build passed. Vite reported the existing chunk-size warning.

## Conversation typography follow-up

Active V2 message text and reply lists use 15 px. Primary reply headings use 19 px and 17 px. The Chromium check measures both sides of the transcript and the width of the conversation pane at 1440 px, then reviews the long reply on mobile.

Commands from `frontend/`.

```sh
pnpm exec playwright test v2-agents-review.spec.ts agent-chat-workspace.spec.ts agent-workspace.spec.ts chat-streaming.spec.ts --workers=2 --output=/tmp/orbit-agent-smaller
pnpm run lint
pnpm exec prettier --check e2e/v2-agents-review.spec.ts src/features/tasks/components/chat/ChatField.jsx
pnpm run build
```

All 44 Chromium checks passed. Frontend lint, changed-file formatting and the build passed.
