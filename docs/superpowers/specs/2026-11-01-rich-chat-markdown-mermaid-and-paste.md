# Specification: Rich Chat Markdown, Mermaid Diagram Rendering, Code Blocks & Clipboard Paste

- **Date:** 2026-11-01
- **Feature:** Rich Chat Markdown Rendering (Mermaid, Code Blocks, Headings, Lists) & Chat Input Clipboard Paste
- **Status:** Approved for Implementation

---

## 1. Problem Statement & Motivation

1. **Rich AI Message Formatting**: When the AI assistant responds with structured responses (such as software architecture ERDs, technical tutorials, or code snippets), the current `MarkdownText.jsx` parser only renders bold text, italic text, inline code, and Markdown tables. 
   - Fenced code blocks (```` ```code ``` ````) are rendered as raw text with backticks.
   - Mermaid diagrams (```` ```mermaid ... ``` ````) do not render as visual diagrams, making diagrams like ERDs, flowcharts, and sequence diagrams difficult to read.
   - Headings (`# `, `## `, `### `), blockquotes (`> `), and list items (`- `, `* `, `1. `) are rendered as plain text strings rather than structured HTML elements.
2. **Chat Input Usability (Paste & Height)**:
   - The `<textarea>` in `ChatField.jsx` is constrained to a tiny height of ~2 lines (`maxHeight: calc(2lh + ...)`). Pasting multi-line instructions or code snippets causes severe cramping and makes reviewing or editing painful.
   - The chat field does not handle image pasting (`onPaste`). When users capture screenshots (via Snipping Tool or screenshot shortcuts) and press `Ctrl + V` into the input, nothing happens, requiring manual file selection through file picker dialogs.

---

## 2. Requirements & Acceptance Criteria

### AC01: Fenced Code Blocks with Copy Functionality
- Multi-line fenced code blocks formatted as ```` ```[language]\n[content]\n``` ```` must be parsed and rendered inside an independent container.
- Container design:
  - Header bar showing the detected language (e.g., `javascript`, `python`, `mermaid`, or `text`).
  - A "Copy" button in the header bar.
  - Clicking "Copy" writes the raw code content to `navigator.clipboard` and provides visual confirmation (icon change / "Copied!" indicator for 2 seconds).
  - Code body rendered with monospace font, scrollable horizontally if lines overflow, and syntax-safe padding.

### AC02: Visual Mermaid Diagram Rendering
- When a fenced code block specifies language `mermaid`:
  - Render an interactive/visual SVG diagram using the `mermaid` engine.
  - Provide a single unified top header with tabs: **[Diagram]** and **[Code]**, language tag, and a persistent **[Copy]** button.
  - No nested inner boxes: the Code tab displays raw pre/code directly without a redundant inner header or duplicate "mermaid" label.
  - Support dark and light theme adaptation to match the application's current theme.
  - **Graceful Error Recovery**: If the diagram contains invalid syntax or fails to render, display a clear fallback notice ("Diagram syntax error") and render the raw code block instead of breaking the chat component.

### AC03: Interactive SVG Vector Rendering & Preview
- When a fenced code block specifies language `svg` or contains an `<svg>` element in `xml`/`html`:
  - Render a visual SVG preview using the `SvgPreview` component.
  - Single unified top header with **[Preview]** and **[Code]** tabs, `svg` language indicator, and persistent **[Copy]** button.
  - **XSS Sanitization**: Automatically strip any `<script>`, `<iframe>`, `on*` event handlers, or `javascript:` URLs to guarantee security.
  - If SVG syntax is corrupted, display a graceful parser error notice and switch to Code tab.

### AC03: Extended Markdown Elements
- **Headings**:
  - `# ` -> `<h1 className="text-base font-bold my-2 text-[var(--color-text)]">`
  - `## ` -> `<h2 className="text-sm font-bold my-1.5 text-[var(--color-text)]">`
  - `### ` -> `<h3 className="text-xs font-semibold my-1 text-[var(--color-text)]">`
- **Blockquotes**:
  - Lines starting with `> ` -> `<blockquote className="border-l-2 border-[var(--color-accent)] pl-2.5 my-1.5 italic opacity-90">`
- **Lists**:
  - Unordered (`- ` or `* `) and ordered (`1. `, `2. `) items render with proper list indentation and markers.
- **Backward Compatibility**:
  - Existing support for `**bold**`, `*italic*`, `_italic_`, inline `` `code` ``, and Markdown tables `|---|` must remain fully intact and properly tested.

### AC04: Auto-Expanding Chat Input
- The textarea in `ChatField.jsx` must adjust its height to accommodate multi-line content.
- Starts at 1 line (~44px) and smoothly expands up to a maximum height of ~180px (approx. 7–8 lines).
- When content exceeds the maximum height, a vertical scrollbar appears.

### AC05: Clipboard Image Paste (`Ctrl + V`)
- Attach an `onPaste` event handler to the chat textarea:
  - Check `event.clipboardData.files` / `items` for image MIME types (`image/*`).
  - If one or more images are found:
    - Prevent the default paste event.
    - Validate files using existing `checkFiles()` helper (size, limits).
    - If valid, append the new image file(s) to the `files` state (rendering them in `AttachmentComposer`).
    - If invalid, set `fileError` with the validation error message.
  - If no images are present in clipboard (plain text paste), allow standard textarea pasting without interference.

---

## 3. UI/UX Specifications

- **Code Block**:
  - Header: `flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-muted)] border-b border-[var(--color-line)] text-xs font-mono text-[var(--color-text-muted)] rounded-t-lg`
  - Pre/Code: `p-3 overflow-x-auto font-mono text-xs leading-relaxed text-[var(--color-text)] bg-black/5 dark:bg-black/20 rounded-b-lg`
- **Mermaid Diagram Container**:
  - Container: `my-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden shadow-xs`
  - Diagram Canvas: `p-4 flex justify-center items-center overflow-x-auto min-h-[120px]`
- **Textarea**:
  - Remove restrictive `maxHeight: calc(2lh + ...)` and replace with `maxHeight: 180px; minHeight: 44px`.

---

## 4. Testable Edge Cases

1. A message with multiple code blocks in different languages (e.g. `javascript` followed by `mermaid`).
2. A Mermaid code block with syntax errors (must fallback cleanly to code view without throw).
3. Pasting text into textarea does not trigger file attachment logic.
4. Pasting an image into textarea when attachment limit is reached displays `fileError`.
5. Markdown text containing tables, headings, and inline code in the same message.
6. Copying code to clipboard handles permissions gracefully.

