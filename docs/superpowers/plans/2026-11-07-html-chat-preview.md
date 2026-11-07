# HTML Chat Preview Implementation Plan

> **For agentic workers:** Use executing-plans for inline execution. User authorized implementation and delegated choices; continue through verification without another approval gate.

**Goal:** View self-contained HTML dashboards in chat with source/copy and expansion.
**Architecture:** Markdown routes completed html fences into HtmlPreview. A pure document builder wraps raw HTML in nested opaque-origin sandboxed frames with an inherited CSP. No host bridge or backend change.
**Tech Stack:** Existing React, TypeScript/JSX, Vitest, Playwright and pnpm tooling.
**Spec:** `docs/superpowers/specs/2026-11-07-html-chat-preview.md`.

## Global constraints

128 KiB source limit; scripts only in sandbox (never same-origin); no network resources or navigation; no new dependencies. Preserve SVG/Mermaid/code and exact source. Existing theme styles and English labels. Tests precede code; lint -> format -> build follow green tests.

## Task 1 — Routing and sandboxed preview

Files: create `frontend/src/features/tasks/components/chat/htmlPreviewDocument.ts`, `HtmlPreview.tsx`, `htmlPreview.css`; modify `MarkdownText.jsx`; create `frontend/src/features/tasks/components/test/HtmlPreview.test.tsx` and extend `MarkdownText.test.jsx`.

Interface: `buildHtmlPreviewDocument(code: string): string | null`, `HTML_PREVIEW_MAX_BYTES = 128 * 1024`; default component `HtmlPreview({ code }: { code: string })`.

- [x] Add failing Markdown tests for closed html with SVG and unclosed html. Assert iframe title `HTML preview`, and no SVG canvas for a full document.
- [x] Run `cd frontend && pnpm exec vitest run src/features/tasks/components/test/MarkdownText.test.jsx`; verify new assertions fail, existing assertions pass.
- [x] Add component tests for code/copy, sandbox and source limit. Expected frame attribute: `sandbox="allow-scripts"`; generated outer CSP: `frame-src 'none'`, `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'` with inline script/style exceptions. Source must be escaped into an inner srcdoc, never interpolated into outer body markup directly.
- [x] Implement the document builder and HtmlPreview using theme tokens and existing CodeBlock for source/copy. Keep React hooks unconditional. Native dialog expansion has close/focus restoration; unique tab IDs and arrow/Home/End keyboard navigation; fixed preview height with internal scrolling. Source tab unmounts running frames.
- [x] Route html before SVG detection and only after a closing fence exists. Preserve non-html behavior.
- [x] Run both component suites until green.

Example routing assertion:

````jsx
render(
  <MarkdownText text={"```html\n<html><body><svg></svg></body></html>\n```"} />,
);
expect(screen.getByTitle("HTML preview")).toHaveAttribute(
  "sandbox",
  "allow-scripts",
);
expect(screen.queryByTestId("svg-preview-canvas")).not.toBeInTheDocument();
````

## Task 2 — Real browser behavior and isolation

Files: create `frontend/e2e/html-preview.spec.ts`. Reuse `dashboardFixture` for auth and mock conversations history as other chat tests do.

- [x] Before implementation, write browser tests that seed a history message containing an html fence. The sample has styled heading, inline SVG, and button incrementing an output. Assert `frameLocator('iframe[title="HTML preview"]').frameLocator('iframe[title="HTML content"]')` displays and interacts with it.
- [x] Run the spec before routing exists; confirm missing preview failure.
- [x] Verify storage and parent DOM reads throw, top navigation and popups fail, and remote fetch/images/scripts/styles plus iframe self-navigation produce zero matching network requests. Route any attempted probe requests to a harmless mocked response; no real third-party traffic.
- [x] Verify hostile closing tags/meta cannot escape the trusted wrapper or weaken inherited policy. Verify expand/close/focus, source copy, reload history and 375px viewport. Take screenshots into ignored Playwright output and inspect them.
- [x] Run `cd frontend && pnpm exec playwright test e2e/html-preview.spec.ts e2e/ui-composition.spec.ts e2e/task-proposals.spec.ts`; fix any failures and keep sandbox policy intact.

## Task 3 — Final verification

- [x] Run `cd frontend && pnpm test`, then `pnpm run lint`.
- [x] Run `pnpm exec prettier --check` on the new/changed source, test and documentation paths explicitly; format only these paths and rerun.
- [x] Run `cd frontend && pnpm run build`, `cd backend && pnpm run build && pnpm test`, and `git diff --check`.
- [x] Review all changes for boundary escapes and unwanted app behavior; record exact test results, Mongo skips and build warnings here. Leave changes uncommitted for user review.

## Execution notes

- Ruling: work in the current clean shared checkout; feature touches only the Markdown preview area, no other agent changes are present at start. No merge/push requested.
- Ruling: use the repository's Playwright runner and existing test fixtures rather than a separate Python harness.

## Verification record

- RED: MarkdownText suite: 7 existing tests passed, 2 new HTML routing tests failed for missing preview. HtmlPreview suite: 4 new tests failed for missing behavior. Browser suite: both tests failed for missing preview before implementation.
- GREEN: `cd frontend && pnpm exec vitest run src/features/tasks/components/test/HtmlPreview.test.tsx src/features/tasks/components/test/MarkdownText.test.jsx`: 13 passed.
- `cd frontend && pnpm test`: 62 files / 296 tests passed. Existing jsdom navigation-not-implemented diagnostic appeared; no test failures.
- `cd frontend && pnpm exec playwright test e2e/html-preview.spec.ts e2e/ui-composition.spec.ts e2e/task-proposals.spec.ts`: 10 passed in Chromium, including inline JS, resource/navigation isolation, source, mobile bounds, history, dialog close/focus, and legacy A2UI regressions. Browser screenshots inspected at 375px and 1280px. Firefox/WebKit and live-model output were not tested.
- `cd frontend && pnpm run lint`: passed.
- `cd frontend && pnpm exec prettier --check src/features/tasks/components/chat/HtmlPreview.tsx src/features/tasks/components/chat/htmlPreviewDocument.ts src/features/tasks/components/chat/htmlPreview.css src/features/tasks/components/chat/MarkdownText.jsx src/features/tasks/components/test/HtmlPreview.test.tsx src/features/tasks/components/test/MarkdownText.test.jsx e2e/html-preview.spec.ts`: passed.
- `cd backend && pnpm run build && pnpm test`: typecheck passed; 420 tests passed, 83 skipped (Mongo integration environment not configured).
- Ruling: native Escape events in opaque child frames cannot reach the host. Retain visible host Close control and native Escape when host controls have focus; do not introduce a message bridge. A follow-up browser test revealed portal key events closing SmallChat, fixed by stopping propagation at the dialog without preventing native default behavior. The new browser regression passes.
- Fixed a test-only TypeScript mismatch: Testing Library ByRole does not accept Playwright's `exact` option; string names already match exactly.
- Independent final code review found no actionable issues. Network claims are limited to tested CSP resource/navigation mechanisms, not CPU quotas or every browser network API.
- `cd frontend && pnpm run build`: typecheck and Vite build passed after the final dialog fix. Existing warnings remain: ErrorPage imported both statically/dynamically and chunks over 500 kB.
- `git diff --check`: clean. Changes remain uncommitted.
