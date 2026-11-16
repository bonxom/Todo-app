# Implementation plan — V2 Agents page and chat bubble

Spec: [../specs/2026-11-15-v2-agents-chat-liquid-glass.md](../specs/2026-11-15-v2-agents-chat-liquid-glass.md)

## Task list

| # | Task | Files |
| --- | --- | --- |
| T1 | Add 14 i18n keys to the `v2` namespace (additive only) | `frontend/src/shared/i18n/locales/en/v2.json`, `.../vi/v2.json` |
| T2 | Lazy `/v2/agents` route with chunk-failure fallback | `frontend/src/features/v2/routes.tsx` |
| T3 | Mount `AgentSessionProvider` + bubble in the V2 shell, pass `?conversation=` | `frontend/src/features/v2/layouts/V2Layout.tsx` |
| T4 | Sidebar `Agents` entry with `aria-current`; topbar section title | `components/V2Sidebar.tsx`, `components/V2Topbar.tsx` |
| T5 | Agents workspace page reusing V1 chat surfaces | `pages/AgentsPage.tsx` |
| T6 | Floating glass chat bubble with live shared session | `components/V2AgentChatBubble.tsx` |
| T7 | Liquid-glass agent styles (columns, panel, trigger, fallbacks) | `styles/v2.css` |
| T8 | Component tests for AC01–AC04 | `test/AgentsPage.test.tsx` |

## Constraints

- Write scope: `frontend/src/features/v2/**`, `frontend/src/app/router.tsx` (not needed — V2 registers its own routes), `shared/i18n/locales/{en,vi}/v2.json` (approved), this spec/plan.
- `features/agent/**` and `features/tasks/**` are import-only.
- No new dependencies.

## Test cases

1. `AgentsPage` renders history, conversation and context regions, one `h1`, and the shared `ChatField` with the provider's `chat`.
2. Bubble: closed by default (`aria-expanded="false"`, panel `hidden`); click opens (`aria-expanded="true"`, panel visible, focus inside panel); `Escape` closes and restores focus to the trigger.
3. Sidebar: `Agents` link points at `/v2/agents` and carries `aria-current="page"` only on that route.
4. Bubble and page share one session: the `ChatField` mock receives the same `chat.send`/`chat.messages` identity.

## Verification commands

```bash
cd frontend && pnpm run test -- --run src/features/v2/test/AgentsPage.test.tsx
cd frontend && pnpm run lint
cd frontend && pnpm run build
cd frontend && pnpm run dev   # http://localhost:5000/v2/agents
```

Manual: open `/v2/dashboard`, use the bubble, send one message, confirm the AI request in devtools and that the transcript also appears on `/v2/agents`; click `New conversation`; reload `/v2/agents?conversation=<id>`.

## Rollback

Revert the V2 files and the two locale additions; `routes.tsx` loses the `agents` entry. No data migration.

## Delivered (2026-11-15)

Implemented and verified in the working tree:

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 7 files, 47 tests passed (6 new in `AgentsPage.test.tsx`) |
| `pnpm run lint` | exit 0, no findings |
| `pnpm run typecheck` (`tsc -b`) | exit 0 |
| `pnpm run build` | exit 0 (pre-existing >500 kB chunk warnings only) |
| Browser, `/v2/agents` at 1440/768/360 | page renders, no horizontal overflow |
| Browser, live send from bubble | `POST /api/ai/conversations` 201, `POST /api/ai/chat-mcp` 200, assistant reply rendered, transcript also present on the page (shared session) |
| Browser, bubble | opens 380×560 glass panel, `Escape` closes, focus returns to trigger |

Deviations from the plan: the duplicated "New conversation" control in the history panel was dropped (the reused `AgentHistoryList` already provides one). Screenshots were captured but the assistant model could not view them; visual checks were done through computed layout, DOM text and overflow measurements. Verification used the already-running dev server on port 5000 (5001 fallback was CORS-rejected by the backend allowlist).

## Follow-up tasks (2026-11-15, second pass)

| # | Task | Files |
| --- | --- | --- |
| F1 | Add V2 chrome keys (tabs, bubble actions, modes) — additive | `locales/{en,vi}/v2.json` |
| F2 | Agent tab bar shared by chat + skills | `components/V2AgentTabs.tsx` |
| F3 | Glass skills library reusing skills hooks | `pages/SkillsPage.tsx` |
| F4 | Glass template-import dialog | `components/SkillTemplateDialog.tsx` |
| F5 | Skill editor with delete, dirty guard, 409 handling, preview | `pages/SkillEditorPage.tsx` |
| F6 | Bubble: new chat, history, open-in-agents, 3 display modes, resize | `components/V2AgentChatBubble.tsx` |
| F7 | Routes for skills list/new/edit | `routes.tsx` |
| F8 | Mode + skills styles, reduced motion, small-viewport rules | `styles/v2.css` |
| F9 | Tests: bubble modes/new chat/history; skills list toggle/empty; editor validation + dirty guard | `test/AgentsPage.test.tsx`, `test/SkillsPages.test.tsx` |

Verification: `pnpm exec vitest run src/features/v2/test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, then browser: bubble mode cycling + resize, new chat, skills create → edit → toggle → delete, and `/v2/agents/skills/:id` deep link.

## Delivered — follow-up (2026-11-15, second pass)

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 9 files, 57 tests passed (new: `AgentChatBubbleModes.test.tsx` 4, `SkillsPages.test.tsx` 5) |
| `pnpm run lint` | exit 0 |
| `pnpm run build` (`tsc -b && vite build`) | exit 0, pre-existing chunk-size warnings only |
| Browser: bubble modes | compact 380×560 → expanded 720×648 → docked 420×768; `ArrowLeft` on the separator 420 → 452 |
| Browser: bubble actions | New chat → `POST /api/ai/conversations` 201; History lists conversations; Open in Agents → `/v2/agents?conversation=<id>` |
| Browser: skills CRUD | create → editor deep link → toggle (`aria-checked` false + “Changes apply from the next chat turn”) → preview → delete → empty list, all against the live backend |

Implementation note: the editor initializes its form from the loaded skill and remounts per skill id (`key`), so no `setState` inside an effect (`react-hooks/set-state-in-effect`). Consequence: a background refetch does not overwrite an open draft — the same guarantee the V1 "adopt only while pristine" rule provided.

## Delivered — layout refinement (third pass)

| Check | Result |
| --- | --- |
| `pnpm exec vitest run src/features/v2/test` | 9 files, 58 tests passed (new: dock state reported to the shell) |
| `pnpm run lint` / `pnpm run build` | exit 0 / exit 0 |
| Expanded | panel centre offset `(0, 0)` at 1365×768, scrim `rgba(14,34,39,0.22)`, scrim click closes |
| Docked | `data-dock="open"`, main-area right 923 vs panel left 945 (gap 22, no overlap); dock 452 → content right 891; close → 1343 |
| Mobile 360×800 | dock stays a full-width overlay, `margin-right: 0`, no horizontal scroll |
