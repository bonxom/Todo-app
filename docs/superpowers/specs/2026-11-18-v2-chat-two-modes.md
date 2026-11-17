# V2 chat: two modes and liquid glass presentation

User request: restyle the opened chat for V2 and remove expanded mode. Keep only compact popup and docked side panel. This updates the old three-mode spec in `2026-11-15-v2-agents-chat-liquid-glass.md`.

## Acceptance

- One toggle switches compact directly to docked and back. No expanded state, expand button, centred scrim or V2 expand translation remains. V1 chat is unaffected.
- Popup opens at the bottom-right (24px desktop / 12px mobile), width up to 420px, height constrained to the viewport. Docked desktop is a glass side panel that reserves workspace room; mobile dock is an inset overlay with no page overflow.
- Split header into identity/close and a second toolbar: labeled New chat, History, Open in Agents, mode toggle. All primary controls remain >=44px, including at 320px.
- Map shared ChatField colors to V2 tokens inside the bubble only: translucent shell, quiet message canvas, teal user messages, readable assistant messages, rounded composer and matching buttons. Do not change chat business rules or global V1 styles.
- Keep session/messages/drafts/tools/attachments, history, new-chat flow, direct Agents navigation, sending/error states and dock resizing. Switching modes never remounts the shared chat. Escape closes history first, then the panel and resets its mode to compact, returning focus to the launcher.
- Textarea, tool expansion and send controls fit narrow widths. Preserve reduced motion/transparency and forced-colors fallbacks.

## Verification

Update mode unit tests before code and verify expected failures. Add Playwright journeys for both modes, retained draft, sending, history/Escape and visible controls at 320/390/1440px in light/dark. Update old V2 browser test requiring the expanded step. Run V2/V1-notification regressions, frontend/backend unit suites, lint, formatting, build/typecheck and production smoke. Inspect screenshots as a user. Live AI/MongoDB and real iOS remain outside fixture-based browser verification.
