# Chat usability implementation plan

> Execute the approved scope task by task using executing-plans; independent Ask-card work may be delegated as requested by that skill. User has authorized autonomous review and implementation.

**Goal:** Make the existing chat clear, comfortable on mobile and truthful about Ask submissions.
**Architecture:** Keep the current session/send hooks and API. Server interaction status controls completion. Header owns a history overlay; composer keeps stable input/tool rows. Scoped chat CSS avoids changing unrelated dashboard styles.
**Tech stack:** React, Tailwind, Vitest, Playwright, pnpm.
**Spec:** `docs/superpowers/specs/2026-11-03-chat-usability.md`.

## Global constraints

Frontend-only; no new dependencies or API changes. Preserve auth, attachments, markdown, request-id retries and saved-conversation mode. English visible copy and accessible labels; preserve user and AI message content. Preserve pre-existing audit artifacts. No commits required by the user.

## Task 1 — Truthful Ask cards

Files: `InteractionCard.jsx`, `components/test/InteractionCard.test.jsx`; integration coverage in `ChatBubble.test.jsx` and browser audit.

- [x] Replace optimistic-success expectations with regressions: submit callback fires, but radios remain until rerender with server `status: answered`; same pending interaction remains editable after disabled true→false; cancellation does not resolve locally.
- [x] Run `pnpm exec vitest run src/features/tasks/components/test/InteractionCard.test.jsx` and record expected red assertions.
- [x] Remove localSubmission as completion authority; keep option/custom draft. Remove double-click submit. Expose custom input via an always-visible answer-method button. Use English labels and direct single-option confirmation CTA. Keep English aria labels for stable test selectors.
- [x] Rerun tests for option, custom, cancel, server completion, single confirmation and pending recovery.

## Task 2 — Stable composer and retained mode

Files: `ChatField.jsx`, new `ChatToolbar.jsx`, `useConversationSession.ts`, `AttachmentComposer.tsx`, `SlashCommandMenu.jsx`, chat styles; tests `ChatField.test.jsx`, `ChatBubble.test.jsx`.

- [x] Add failing tests: visible Agent mode select; skill button opens list; starter fills input; `fireEvent.keyDown(textarea,{key:'Enter',isComposing:true})` does not submit; new chat preserves Ask.
- [x] Run focused tests and record expected failures.
- [x] Replace expanding inline toolbar with a separate full-width toolbar row and anchored attachment menu. Mode stays visible even in Ask cards. Use `event.nativeEvent.isComposing` before handling Enter. Keep input/send form and file validation behavior.
- [x] Remove `setMode('auto')` from successful newConversation; saved conversations continue using load's mode.
- [x] Localize visible helper, attachment and error/recovery copy; retain API error detail and safe retries. Add welcome prompt buttons with `setInputValue(prompt); textareaRef.current?.focus()`.
- [x] Verify focused tests then fix genuine regressions in existing attachment/slash tests.

## Task 3 — History, responsive shell and presentation

Files: `SmallChat.jsx`, `RecentConversations.jsx`, `ChatBubble.jsx` owner, `styles/chat.css` imported by chat shell, existing browser fixture/tests.

- [x] Add failing history test: enter draft → header history → close → draft unchanged. Cover search/open failure and no forced new conversation.
- [x] Keep ChatField mounted under a hidden container while history is open; history open/close has focus restoration. Use existing `chat.openConversation` and reflect failures.
- [x] Header: title, history, new chat, display mode, close. Remove meaningless green connectivity dot. Mobile full viewport with safe areas; desktop compact 440px and readable expanded content. Theme controls and disabled send in scoped CSS; full-width bot blocks, short timestamps.
- [x] Add diagram zoom/reset regression; implement 100–200% SVG sizing with an overflow container and active-theme rendering in `MermaidDiagram.jsx`. Localize rich-content toolbar labels while retaining accessible selectors.
- [x] Check keyboard focus with existing launcher lifecycle. Add autofocus only when panel opens, not on every message.

## Task 4 — User review and verification

- [x] Browser scenarios: Ask option/custom/cancel, 422 reload and edit, 503 retry same requestId, mode retained on new chat, history/draft, slash, attachment limits, compact/expanded/docked, light/dark at 1440, 390, 320 and short viewport. Save new screenshots separate from baseline audit.
- [x] Review screenshots, correct visible clipping, contrast and focus issues, rerun checks affected by corrections.
- [x] `cd frontend && pnpm test && pnpm run lint && pnpm run build`.
- [x] `cd backend && pnpm test && pnpm run build` (plus lint if changed backend; none planned).
- [x] Use `pnpm exec prettier --write <changed supported files>` then `--check` on those files only. Format spec/plan too. Do not reformat unrelated existing files.
- [x] Review final diff, update checkboxes and document exact results, screenshots, outstanding limitations. No claim of live AI validation from fixtures.

## Completion evidence — 2026-11-04

Implemented and reviewed against the spec. Initial red tests established missing server-confirmed Ask state, visible mode/tools, draft recovery, history switching, diagram zoom and mobile focus containment. Browser review additionally exposed short-viewport action clipping and mobile dock stacking; both were corrected and regression-tested.

Verification commands were run separately so an existing frontend test failure would not prevent lint/build verification. Final browser suite: 12 passed. Frontend unit suite: 194 passed, one pre-existing CalendarTaskDetailCard order assertion failed; reproduced against an isolated archive of HEAD. Backend: 224 passed, 49 integration tests skipped without MongoDB configuration. Frontend lint, scoped Prettier check, frontend build/type-check and backend build/type-check passed. Build retains large-chunk warnings. Completed checkboxes mean checks executed and results reviewed, not that every repository test passed.

See [final user review](../../ui-audit/2026-11-03-chatbot/AFTER-REVIEW.md) for screenshots, commands, limitations and remaining work.

## Approved toolbar adjustment

Restore an icon-only `>` disclosure, collapsed by default, that reveals attachment and skill actions. Keep Auto/Ask visible and English copy. Close on selection, outside focus/click, or Escape; Escape restores toggle focus. Preserve full input width on mobile. Verify hidden actions, toggle state, skill selection and existing browser regressions before final lint, formatting and build. This adjusts the existing toolbar style without adding a feature.

### Corrected placement

The disclosure belongs inside the message form, immediately left of the input. Expanding reveals inline image, file, mode and skill icons, with no floating menu or visible action labels. Match the original right/left chevron rotation. On narrow screens the expanded icon row wraps above the input to retain usable input width. English accessible names and mode controls remain.

### Latest approved simplification

Remove the Skill icon, Mode dropdown and explanatory footer as marked in the user screenshot. Keep slash skills available. The inline robot is the sole mode toggle: Ask uses the accent theme and question badge; Auto uses green and a lightning badge. Expose the current mode in accessible name/title and aria-pressed, retain locked-state protection and mode persistence. Prior visible-selector requirements are superseded. Verify both states and absence of removed controls.
