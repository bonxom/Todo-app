# V2 Agents page and chat bubble — Liquid Glass

Date: 2026-11-15. Status: approved for implementation (objective in goal mode).

Supersedes nothing; extends [Liquid Glass refinement](2026-11-15-liquid-glass-refinement.md) to two new V2 surfaces. V1 behavior is the functional reference; V2 changes presentation only.

## 1. Objective

Add the two remaining V2 surfaces requested by the user:

1. **Agents page** at `/v2/agents` — full agent workspace (conversation history, conversation, context/activity).
2. **Chat bubble** — a floating, liquid-glass launcher that opens a compact live chat panel on every `/v2/*` page.

Both are wired to the real AI backend through the existing V1 session/hook stack. No backend change, no API shape change, no mock data.

## 2. Scope

### In scope

- `frontend/src/features/v2/pages/AgentsPage.tsx` — liquid-glass workspace shell.
- `frontend/src/features/v2/components/V2AgentChatBubble.tsx` — floating trigger + glass chat panel.
- `features/v2/routes.tsx` — lazy `agents` route with `RouteLoadError` fallback.
- `features/v2/layouts/V2Layout.tsx` — mount `AgentSessionProvider` and the bubble; pass `?conversation=` as the initial conversation.
- `features/v2/components/V2Sidebar.tsx` — `Agents` navigation entry with active state.
- `features/v2/components/V2Topbar.tsx` — title follows the active V2 section.
- `features/v2/styles/v2.css` — `.v2-agent-*` and `.v2-assistant-*` classes, V2-scoped only.
- `shared/i18n/locales/{en,vi}/v2.json` — 14 new keys (added, none renamed or removed). User-approved exception to the write boundary.
- Tests under `features/v2/test/`.

### Out of scope

- `features/agent/**`, `features/tasks/components/chat/**` — imported read-only, never modified.
- Skills pages in V2, conversation deletion/renaming, attachments UI redesign, A2UI redesign.
- Visual changes to V1, new dependencies, i18n key changes outside the two `v2.json` files.
- Backend endpoints, chat streaming protocol, auth.

## 3. Architecture

```text
router.tsx (unchanged registration mechanism)
└── /v2 lazy V2Layout
    └── AgentSessionProvider (initialConversationId from ?conversation=)
        ├── V2Sidebar / V2Topbar / <Outlet/>
        │   ├── /v2/dashboard → DashboardPage
        │   └── /v2/agents    → AgentsPage (lazy)
        └── V2AgentChatBubble  (fixed, every V2 route)
```

- **One session, two surfaces.** `AgentSessionProvider` owns `useConversationChat`; `AgentsPage` and `V2AgentChatBubble` both read it through `useAgentSession()`, exactly as V1 shares state between `AgentPage` and `AgentChatBubble`.
- **Behavior reuse, not reimplementation.** Message list, composer, attachments, interaction cards, task proposals, slash commands and markdown all come from the existing `ChatField`. History, context and activity panels come from `AgentHistoryList`, `AgentContextPanel`, `AgentActivityList`. Discard confirmation comes from `AgentDiscardDialog`. Navigation state comes from `useAgentNavigation`.
- **No duplicate services.** `ChatField` reaches the AI backend through `useAgenticChatMutation` → `aiService`, unchanged.
- **V1 untouched.** `V1RouteLayout` keeps its own provider and bubble.

## 4. Behavior contract

| Concern | Required behavior |
| --- | --- |
| Send message | Real `POST` through the existing AI mutation; identical payload/paths to V1. Errors surface inline, never swallowed. |
| Bubble open/close | Trigger toggles panel. `Escape` closes. Focus returns to the trigger on close. Panel is removed from the a11y tree while closed (`hidden` + `aria-expanded`). |
| Composer state | Shared with the page through the provider draft: text typed in the bubble is present on the Agents page and vice versa. |
| Conversation selection | History selection, new conversation and discard confirmation behave as in V1 (same `useAgentNavigation` + `chat` state). |
| `?conversation=` | Read once at layout mount as the initial conversation; later selection is explicit. |
| Loading | Loading conversation shows a status message; empty conversation shows the starter prompts. |
| Unavailable conversation | Explicit message plus `startNewConversation`; no blank panel. |
| Disabled state | While `chat.locked` the composer is disabled (V1 parity). |

## 5. Visual contract

- Materials follow the refinement spec: shell glass ~45–60% light fill, frosted content panels 65–80%, near-opaque controls, 18–24px backdrop blur on major surfaces only, directional edge highlight, graded elevation.
- Agents workspace: three inset glass columns at ≥1200px (`history 240px / conversation / context 300px`), two at ≥900px (context hidden), one below 900px (history and context collapse into toggled panels).
- Chat bubble: 56px circular glass trigger, bottom-right, 24px inset; panel `min(380px, 100vw - 32px)` × `min(560px, 100dvh - 140px)`, radius 26px, above the topbar.
- Text contrast from `--v2-ink`/`--v2-muted`; no per-row blur; no continuous animation; `prefers-reduced-motion` and no-`backdrop-filter` fallbacks honored (opaque surfaces).
- All classes prefixed `.v2-`; no `:root` overrides; V2 stylesheet remains imported only from the lazy entry.

## 6. Accessibility

- Bubble trigger: `aria-label`, `aria-expanded`, `aria-controls`; panel has `role="dialog"`-equivalent semantics via labelled `section`, close button labelled.
- One `h1` on the Agents page; landmarks for history (`aside`), conversation (`section`), context (`aside`).
- `aria-live="polite"` status for sending/loading/error, as in V1.
- Focus visible through the shared `.v2-app :focus-visible` ring; 44px minimum targets.

## 7. Acceptance criteria

| ID | Condition | Evidence |
| --- | --- | --- |
| AC01 | `/v2/agents` renders the workspace with history, conversation and context regions | Component test + browser |
| AC02 | Bubble trigger opens/closes the glass panel, `Escape` closes, focus returns | Component test |
| AC03 | Sending from bubble and page uses the real shared chat session (`ChatField` with `chat.send`, `chat.messages`) | Component test + manual run against backend |
| AC04 | Sidebar exposes `Agents`, marked current on `/v2/agents` | Component test |
| AC05 | `?conversation=` becomes the initial conversation | Code path + manual check |
| AC06 | `pnpm run lint` and `pnpm run build` exit 0 | Command output |
| AC07 | No file outside the allowed set changed | `git status --short` |

## 8. Known limits

- Conversation-level parity for A2UI proposals depends on `ChatField`'s own behavior; V2 does not re-style individual message widgets.
- V2 does not implement skills pages; `useAgentNavigation` remains conversation-only.
- Manual browser verification against live AI requires `backend/.env` with `AI_API_KEY`; if unavailable, the manual send check is reported as not run rather than claimed.

## 9. Follow-up increment: bubble modes and Skills (2026-11-15)

User-reported gaps after the first delivery: the bubble lacks *New chat* and its display modes (expand, side/docked chat); the Agents tab lacks Skills.

### 9.1 Bubble — parity with V1 `SmallChat`

| Control | Behavior |
| --- | --- |
| New chat | `chat.newConversation()`; the discard prompt still governs an unsaved conversation; composer gains focus on success. |
| History | Toggles a glass popover rendering the existing `RecentConversations` (`onOpen` → `chat.openConversation`). Escape closes history first, then the panel. |
| Open in Agents | Navigates to `/v2/agents`, carrying `?conversation=<id>` when a conversation exists. |
| Display modes | Cycle `compact → expanded → docked`. Compact: 380×560 anchored bottom-right. Expanded: `min(720px, 100vw-48px)` × `min(760px, 100dvh-120px)`. Docked: right edge, full height, `--v2-dock-width` (default 420px). |
| Resize (docked only) | Left-edge `role="separator"` handle; pointer drag plus ArrowLeft/ArrowRight (32px steps). Minimum 320px, maximum 50vw; dragging below the minimum closes the panel (V1 parity). |

State is presentation-only: no new session, no new query keys.

### 9.2 Agents — Skills tab

Route set inside `features/v2/routes.tsx`:

```text
/v2/agents               Chat workspace (existing)
/v2/agents/skills        Skills library (new)
/v2/agents/skills/new    Create skill (new)
/v2/agents/skills/:id    Edit skill (new)
```

Shared tab bar (`V2AgentTabs`) on all three; `aria-current="page"` on the active tab.

Reuse, unchanged: `useSkills`, `useSkill`, `useSkillTemplates`, `useImportTemplateMutation`, `useCreateSkillMutation`, `useUpdateSkillMutation`, `useToggleSkillMutation`, `useDeleteSkillMutation`, `MarkdownText`. No new service, no new query key, no backend change.

Skills library (glass):

- Search over name/description; count of total/active; `N active · max 50 skills`.
- Enable switch per row through `useToggleSkillMutation` (optimistic); notice `Changes apply from the next chat turn` on success, inline error on failure.
- Row opens the editor. Actions: `New skill`, `Add from template`.
- States: loading, error + retry, empty, filtered empty.

Skill editor (glass), parity with V1 validation:

- Fields: name (1–80), description (1–500), instructions (1–10000), enabled switch, preview toggle rendering markdown.
- Create posts `{name, description, instructions, enabled}` then navigates to the edit URL; edit sends `expectedVersion` from the loaded baseline.
- 409 → version-conflict message; other errors inline; input retained.
- Delete with confirmation and `expectedVersion`; returns to the library.
- Dirty guard: `useBlocker` dialog (Keep editing / Discard) plus `useBeforeUnload`; bypass after a successful save/delete.
- Adopt refetched server data only while the form is pristine (V1 rule).

Template import dialog: lists templates from `useSkillTemplates`, shows name/description/version, imports through `useImportTemplateMutation({templateId, expectedTemplateVersion})`, then opens the created skill.

### 9.3 Acceptance for this increment

| ID | Condition |
| --- | --- |
| AC08 | Bubble exposes New chat, History, Open in Agents and cycles compact/expanded/docked with a keyboard-operable resize handle. |
| AC09 | New chat creates a conversation through the existing AI mutation and focuses the composer. |
| AC10 | Skills library lists, searches, toggles and navigates; create/edit/delete round-trip against the real API. |
| AC11 | Skills editor enforces V1 limits, blocks dirty navigation, and surfaces 409 conflicts. |
| AC12 | `lint`, `typecheck`, `build` and the V2 Vitest suite pass; no file outside the allowed set changes. |

### 9.4 Not included

Skills read-records/analytics beyond the V1 fields, skill sharing/export, template authoring, and bubble drag-to-reposition (V1 has none either).

## 10. Bubble layout refinement (2026-11-15, third pass)

User decision: *expanded* must open in the middle of the screen; *docked* (side chat) must push the workspace aside instead of covering it.

- **Expanded** — the assistant wrapper becomes a viewport-sized layer with a soft scrim (`rgb(14 34 39 / 22%)`); the panel is centred both axes (`min(760px, 100vw−64px)` × `min(720px, 100dvh−120px)`). A click on the scrim closes the panel; clicks inside the panel do not.
- **Docked** — the panel is a real side column: `width: var(--v2-dock-width)`, full height, attached to the right edge. `V2AgentChatBubble` reports `{open, width}` through `onDockChange`; `V2Layout` sets `data-dock="open"` and `--v2-dock-width` on `.v2-app`, and `.v2-main-area` gains `margin-right` so the shell, topbar and content shrink instead of being covered. Closing resets the margin with a 160 ms transition (`prefers-reduced-motion` disables it).
- Resizing the dock handle moves the content in lockstep.
- Below 900px the dock remains a full-width overlay and the margin stays 0 — a phone-width viewport has no room for a side column.

Measured (1365×768): expanded centre offset `0,0`; docked content right edge 923 vs panel left 945 (22px gap, no overlap); widening the dock to 452 moves the content edge to 891; closing restores 1343; 360×800 docked stays an overlay with no horizontal scroll.
