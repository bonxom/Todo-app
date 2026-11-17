# V2 chat two-mode refinement plan

**Spec:** docs/superpowers/specs/2026-11-18-v2-chat-two-modes.md
**Execution:** Inline, per the user's direct implementation request. Preserve all earlier uncommitted changes.

- [x] Update `AgentChatBubbleModes.test.tsx` to require compact ↔ docked directly, no expand action, resize and Escape reset. Add browser journeys in `e2e/v2-chat-two-modes.spec.ts`; run before implementation.
- [x] Refactor only presentation state/header in `V2AgentChatBubble.tsx`: two modes and two header rows. Keep one shared ChatField mounted, existing session and mutations. Remove expanded-specific CSS from V2 styles and simplify old compact selectors.
- [x] Add `styles/assistant.css` imported after topbar styles: V2 token bridge for shared chat, glass panel/header/messages/composer, readable history/errors, 44px buttons, responsive popup/dock, tool wrapping and accessibility fallbacks.
- [x] Update V2 localized strings/tests/docs that still describe three modes; leave V1 expand functionality intact.
- [x] Run unit/browser regressions, inspect popup/dock screenshots, correct issues. Run lint/format/build/typecheck and production checks. Record commands/results and limitations with visual evidence; do not commit or deploy.

## Final user correction and review

- Compact must open at the bottom-right, 24px desktop / 12px mobile. Removed topbar anchor state and added measured bottom/right coordinate assertions before the fix; confirmed the old position failed and the new position passes.
- Keep the assistant launcher in the topbar and only two modes.
- Reviewed screenshots for light popup, dark dock, narrow mobile and long text/tools on a 568px-high viewport. Removed the extra inner textarea focus ring while preserving a clear composer focus boundary.
- Final: 74 UI + 3 production Playwright checks, 496 frontend unit tests, 539 backend unit tests with 97 configured skips; lint/format/build/typecheck pass.
- User requested commit and push on the current branch after completion; no PR or merge requested.
