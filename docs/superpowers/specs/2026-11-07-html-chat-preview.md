# HTML previews in chat

Approved direction: user delegated implementation choices on 2026-11-07. Render self-contained HTML/CSS/JavaScript dashboards directly in chat, preserving original source.

## Behavior and acceptance criteria

1. Closed fenced blocks labelled html (case-insensitive) render a Preview/Code panel. Both full documents and fragments work. HTML containing inline SVG remains an HTML preview; explicit svg fences keep the existing SVG renderer. Unclosed html fences remain code until complete.
2. Preview is initially selected. Local inline JavaScript and inline CSS run. Code shows the exact original source and reuses the existing copy action. Switching to Code unmounts the preview. Returning to Preview restarts it.
3. Expand opens a native modal dialog with a larger preview and labelled close control. Closing restores focus. Escape closes the dialog when a host toolbar control has focus; key events inside the opaque embedded document do not propagate to the host, so its always-visible Close control remains the exit. No cross-frame message bridge is added for keyboard events. Expansion restarts the document; app data never flows into the preview. At 375px the toolbar wraps and preview content scrolls inside its frame, not the page.
4. Two sandboxed opaque-origin srcdoc frames isolate generated code. The outer document is trusted markup with a CSP before any generated content; its frame-src policy blocks the inner document from navigating to network URLs. The inner document contains the original source, attribute-escaped. Both sandbox attributes allow scripts only. Do not enable same-origin, popups, forms, downloads or top navigation. Disable device and clipboard permissions and send no referrer.
5. Inherited CSP permits inline styles/scripts and data/blob images/fonts only. It blocks fetch, XHR, sockets, remote scripts/styles/images, workers, objects, forms and network frame navigation. No message bridge or host API is exposed. Browser tests must verify resource requests and self/ancestor navigation rather than assuming sandbox alone blocks them. If this architecture fails browser verification, revise the design before shipping scripts.
6. Sources above 128 KiB render code plus an explanation, without a frame. Empty source remains viewable. Browser-corrected malformed HTML can render; resource or script errors remain inside preview. Dependencies on external CDNs will not load; the toolbar includes a concise self-contained-preview note.
7. Historical messages use the same Markdown renderer and gain preview automatically. Non-HTML code, Mermaid, SVG and A2UI remain compatible.

## Scope

Frontend only. No new A2UI component, backend endpoint, AI tool, prompt, dependency, persistence schema or export feature. Existing chat theme tokens, typography and compact rich-content header styling apply. Use English UI labels to match current app controls. This is a convenience renderer, not a resource-quota execution service: runaway computation and arbitrary browser-engine vulnerabilities are outside the protection contract. Do not claim CPU isolation or support remote libraries.

## Test and verification

Unit/component tests cover HTML/SVG routing, incomplete fences, preview/code/copy, large source fallback, independent instances and outer/inner document structure. Playwright verifies inline JS, styling, opaque origin/storage/parent isolation, blocked resources and frame/form/popup navigation, expansion/focus, history reload and mobile overflow with mocked chat history. Run all frontend tests, selected browser regressions, lint, changed-file Prettier and build; run repository minimum backend build/tests and report Mongo skips. Review screenshot of desktop and mobile preview.

References: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe and https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc. Browser verification is required for the specific nested CSP design.
