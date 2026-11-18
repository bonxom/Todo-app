# Agents v2 — detailed UI and interaction review

Date: 2026-11-18. Worktree: `/home/bonxom/.codex/worktrees/7b00/TodoApp`. User requested a deeper Agents review after the first pass aligned only outer glass panels.

## Corrected findings

1. **V1 colors inside V2 panels.** Shared history, context, chat bubbles and composer consumed global V1 variables, producing cyan buttons, blue messages and slate input surfaces. Added `features/v2/styles/agents.css` to bind those variables to Orbit tokens only within `.v2-agents`. Neither V1 chat styling nor the dock's appearance is changed by this binding.
2. **Avatar inconsistency.** Shared default avatars loaded the same external image for user and agent. V2 Agents now opts into local user/bot icons; an actual profile avatar is still used when present. The shared default behavior is preserved for existing callers.
3. **Clipped/wrapped history controls.** New conversation now fits its column; history search and conversation rows have consistent sizing and active-state treatment. Full conversation titles remain available through their title attribute.
4. **Misleading history failure.** A failed list request previously cleared the list and showed an empty state. It now shows an accessible failure message with retry, without clearing the active chat. Retrying has a loading/disabled state.
5. **Raw translation placeholder.** Created-task receipts called a translation requiring a title without providing one. They now use a dedicated localized event label; the resource title is shown once in the card body. Added the missing accessible conversation-region translation.
6. **Overlapping mobile panels.** History and context toggles are mutually exclusive; opening a panel moves focus into it; close/Escape restores the relevant toggle. Escape already consumed by a nested control is respected. History no longer covers the toolbar toggles. On tablet, the history toggle is hidden while the history column is already visible.
7. **Context dropdown loses theme.** The select menu is portaled under body and lost the trigger's locally scoped theme. Shared CustomSelect now carries the relevant computed theme values to its portal. Positioning and native-select behavior remain unchanged. Added a unit regression and a browser assertion comparing menu/trigger surfaces.
8. **Duplicate empty-chat UI.** Agents and shared ChatField both rendered welcome prompts/starters. Agents now renders one set; selecting a starter fills and focuses the composer. Other ChatField callers retain their existing welcome UI by default.

## Browser coverage

Chromium, fixtures for real frontend HTTP/query flows; the server is launched from this worktree on isolated port 5130. Actual AI/MongoDB-backed conversation execution was not used for these automated cases.

Exercised light/dark, Vietnamese labels, desktop/tablet/mobile (320/390/768/1024/1440px), long unbroken messages and code blocks, no document horizontal overflow, history search, request failure/retry, draft preservation, sending and receiving a response, project-context change, empty-chat starters, mobile panel switching, Escape and focus restoration. Opened and visually inspected desktop light/dark, mobile and empty-chat screenshots. Existing regression suites additionally cover reduced transparency and Dashboard/Calendar material consistency.

Red reproductions were observed for overlapping panels, masked history errors, lost dropdown styling and duplicate empty-chat UI before their fixes. Initial browser scripts also encountered ambiguous locators because the hidden assistant mounts the same session; selectors were corrected to target the visible Agents center before assessing functionality.

## Verification

Commands below run from `frontend/`:

- `pnpm exec playwright test --config=/tmp/statistics-glass.playwright.config.ts e2e/v2-agents-review.spec.ts e2e/v2-glass-consistency.spec.ts e2e/frontend-v2-polish.spec.ts --project=chromium`: **24 passed**.
- `pnpm exec playwright test --config=/tmp/statistics-glass.playwright.config.ts e2e/v2-agents-review.spec.ts --project=chromium`: **10 passed** after the last tablet-toggle CSS adjustment.
- `VITE_SERVER_URL=http://localhost:4000 pnpm test --maxWorkers=2`: **99 files, 527 tests passed**. The URL matches the existing refresh-client mocks. Existing jsdom navigation and unmocked-network diagnostic output remains.
- `pnpm run lint`: passed.
- `pnpm run build`: passed, including TypeScript checking. Existing ErrorPage mixed-import and >500kB chunk warnings remain. The final post-build change only narrows the tablet history-toggle CSS rule and was browser-tested.
- `pnpm exec prettier --check src/features/v2/pages/AgentsPage.tsx src/features/v2/styles/agents.css src/features/agent/AgentActivityList.tsx src/features/agent/AgentHistoryList.tsx src/features/tasks/components/chat/ChatAvatar.tsx src/features/tasks/components/chat/ChatField.jsx src/shared/components/CustomSelect.tsx src/shared/components/test/CustomSelect.test.tsx src/features/tasks/components/test/ChatAvatar.test.tsx src/shared/i18n/locales/en/agent.json src/shared/i18n/locales/vi/agent.json src/shared/i18n/locales/en/v2.json src/shared/i18n/locales/vi/v2.json e2e/v2-agents-review.spec.ts`: passed. Final adjusted CSS/test files were also checked again.
- `git diff --check`: passed.
- `curl -s -o /dev/null -w 'Agents live: %{http_code}\n' http://localhost:5127/v2/agents`: 200; the existing live frontend serves the updated worktree.

No backend source changed in this review, and backend tests were not rerun in this pass. Earlier repository-wide formatting failures outside these files remain as documented in the Statistics review. No commit, merge or deployment performed.

## Artifacts

Screenshots under `/tmp/v2-agents-review/`: `desktop-light.png`, `desktop-dark.png`, `desktop-vi-dark.png`, `mobile.png`, `width-320.png`, `width-768.png`, `width-1024.png`, `empty.png`, `sent.png`.

Logs: `/tmp/v2-agents-browser-final.log`, `/tmp/v2-agents-last.log`, `/tmp/v2-agents-tests-final.log`, `/tmp/v2-agents-build-final.log`. Temporary Playwright configuration: `/tmp/statistics-glass.playwright.config.ts` (inherits the repository config, isolated port 5130, two workers, no server reuse).
