# Chat usability and reliable Ask responses

## Intent and design

Implement the improvements authorized after the desktop/mobile and Ask audits in `docs/ui-audit/2026-11-03-chatbot/`. This is a bounded redesign of existing chat flows, with a complete feature spec because history access and welcome actions are added. User authorized autonomous implementation and self-review; do not require another approval gate.

Keep the existing blue visual identity and shared font. Use existing canvas/surface/text/accent tokens, restrained borders, a clear text hierarchy (18px welcome, 14–16px body, 12px metadata). Main design choice: a stable full-width composer with its tools on a separate row, plus a visible mode selector. Desktop compact/docked modes remain; mobile uses the viewport instead of a small floating card. Rejected alternatives: merely restyling icons would preserve discoverability problems; replacing the app shell is unnecessary.

## Acceptance criteria

1. Pending Ask cards never display answered/cancelled success before the server snapshot resolves them. Retain the selected option/custom answer during failures. After 422 then reload of the same pending interaction, users can edit and submit again. During a request, disable duplicate submits. No double-click bypass of submit.
2. Ask allows option answers, custom answers, cancel and ordinary-message replacement, preserving their existing distinct payloads. Confirmation with one affirmative option uses a direct action button. Historical resolved cards remain readable.
3. Auto/Ask is always visible while composing or answering. Explain Ask as asking to clarify directions, never as mandatory confirmation for every write. New chat retains the current mode; loading an existing conversation uses its saved mode. No backend contract changes.
4. History is available from the chat header during a conversation. Opening/closing history preserves the draft and attachments. A selected conversation loads through the existing hook; failures remain recoverable. A new conversation clears its own draft. History is disabled during an active request.
5. Empty chat provides three relevant starter prompts that fill the composer without automatically sending. A visible skills action complements slash commands. Files remain reference-only, with limits communicated before selection.
6. Composer keeps its input width when tools open, and has an accessible visible mode select (no hidden tab stop). Disabled send has a visibly different neutral style and no enabled hover. Enter sends, Shift+Enter inserts a newline; IME composition Enter must not send.
7. Mobile <=640px uses a viewport-sized chat with pinned header/composer, safe-area padding and scrollable content. No page horizontal overflow at 390px or 320px. Ask custom answer is discoverable without scrolling through options. Main send/actions remain reachable in a short 500px viewport.
8. Messages use compact time with full date available on hover. Rich content can use available width; expanded desktop chat has a readable centered content column. Dark mode uses themed input/control colors and readable user-message text. Keep existing Markdown/Mermaid behavior; provide diagram zoom 100–200% with reset, and render Mermaid with the active theme.
9. Visible chat copy, accessible labels and formatting use English. User and AI message content retain their original language. Opening chat places focus on a visible control; closing restores launcher focus. Mobile keyboard focus stays within the full-screen panel and background content is inert; desktop remains nonmodal. Reduced motion remains respected.

## Scope, error handling and non-goals

Frontend-only; preserve API, auth, ownership, refresh behavior, file limits and request-id retry semantics. Use existing React, Vitest and Playwright; no new dependencies. No real AI/database claims from mocked checks. Do not add a new chat backend, streaming, document analysis, persistence of unsubmitted attachments across reload, or global app localization. Processing requests offer an explicit reload/check-result action without replaying the send. Preserve text drafts when creating the initial conversation fails, and preserve a next-message draft typed during a pending reply. Unknown server errors remain visible; use contextual local guidance and explicit retry/reload controls.

## Validation

Write regression tests first for pending answer recovery, cancellation, mode retention, header history preserving drafts, welcome actions and IME behavior. Run them red before implementation. Run focused then full frontend/backend unit suites, frontend lint/build and backend build. Format changed supported files with local Prettier and check them; run affected-package lint. Browser-test mocked API Ask success, 422/reload/edit, 503/retry same request, history, mode, attachments, slash skills, mobile/desktop/dark and screenshots. Clearly report live-service/real-device limitations.

## Approved toolbar adjustment

Restore an icon-only `>` disclosure, collapsed by default, that reveals attachment and skill actions. Keep Auto/Ask visible and English copy. Close on selection, outside focus/click, or Escape; Escape restores toggle focus. Preserve full input width on mobile. Verify hidden actions, toggle state, skill selection and existing browser regressions before final lint, formatting and build. This adjusts the existing toolbar style without adding a feature.

### Corrected placement

The disclosure belongs inside the message form, immediately left of the input. Expanding reveals inline image, file, mode and skill icons, with no floating menu or visible action labels. Match the original right/left chevron rotation. On narrow screens the expanded icon row wraps above the input to retain usable input width. English accessible names and mode controls remain.

### Latest approved simplification

Remove the Skill icon, Mode dropdown and explanatory footer as marked in the user screenshot. Keep slash skills available. The inline robot is the sole mode toggle: Ask uses the accent theme and question badge; Auto uses green and a lightning badge. Expose the current mode in accessible name/title and aria-pressed, retain locked-state protection and mode persistence. Prior visible-selector requirements are superseded. Verify both states and absence of removed controls.
