# Implementation Plan: Rich Chat Markdown, Mermaid Diagram Rendering, Code Blocks & Clipboard Paste

- **Date:** 2026-11-01
- **Spec:** `docs/superpowers/specs/2026-11-01-rich-chat-markdown-mermaid-and-paste.md`
- **Status:** Completed

---

## 1. Overview & Architecture

This plan implements full markdown parsing enhancements in the frontend chat:
1. `CodeBlock.jsx`: Isolated code block renderer with language badge and copy-to-clipboard functionality.
2. `MermaidDiagram.jsx`: Isolated Mermaid diagram renderer with dynamic SVG generation, theme sync, error boundary fallback, and a single clean Diagram / Code top header with copy button.
3. `SvgPreview.jsx`: Vector SVG preview component with dynamic DOM sanitization (stripping XSS/scripts), Preview / Code tabs, and copy button.
4. `MarkdownText.jsx`: Enhanced parser supporting fenced code blocks (Mermaid, SVG, generic code), headings, blockquotes, lists, alongside existing tables and inline formatting.
5. `ChatField.jsx`: Support for clipboard image paste (`onPaste`) and auto-expanding textarea styling.

---

## 2. Ordered Tasks

### Task 1: Create `CodeBlock.jsx` component and unit tests
- **File:** `frontend/src/features/tasks/components/chat/CodeBlock.jsx`
- **Test:** `frontend/src/features/tasks/components/chat/test/CodeBlock.test.jsx`
- **Details:**
  - Component accepts `code` (string) and optional `language` (string).
  - Header displays language in uppercase/lowercase monospace, plus a Copy button with clipboard icon.
  - On copy, writes `code` to `navigator.clipboard.writeText` and toggles copied state (`Check` icon and "Copied" text for 2 seconds).
  - Code container with monospace font, overflow-x-auto, syntax-friendly styling.

### Task 2: Create `MermaidDiagram.jsx` component and unit tests
- **File:** `frontend/src/features/tasks/components/chat/MermaidDiagram.jsx`
- **Test:** `frontend/src/features/tasks/components/chat/test/MermaidDiagram.test.jsx`
- **Details:**
  - Accepts `code` (string).
  - Initializes `mermaid` with appropriate theme (respects dark theme from document class).
  - Asynchronously renders SVG with `mermaid.render(id, code)` using a unique container ID.
  - Tab header: **[Diagram]** and **[Code]**.
  - Fallback state: If `mermaid.render` throws (e.g. invalid syntax), automatically falls back to code view and displays a warning note without crashing.

### Task 3: Upgrade `MarkdownText.jsx` parser
- **File:** `frontend/src/features/tasks/components/chat/MarkdownText.jsx`
- **Test:** `frontend/src/features/tasks/components/chat/test/MarkdownText.test.jsx`
- **Details:**
  - Tokenize text into block segments:
    - Fenced code blocks (` ```lang ... ``` `):
      - If `lang.toLowerCase() === 'mermaid'`, render `<MermaidDiagram code={...} />`.
      - Otherwise, render `<CodeBlock code={...} language={lang} />`.
    - Markdown tables (`| ... |` with separator): preserve existing table renderer.
    - Headings: `# `, `## `, `### `, `#### `.
    - Blockquotes: `> `.
    - Lists: `- `, `* `, `1. `.
    - Paragraphs: parse inline formatting (`**`, `*`, `_`, `` ` ``).

### Task 4: Enhance `ChatField.jsx` (Clipboard Image Paste & Auto-Resize)
- **File:** `frontend/src/features/tasks/components/chat/ChatField.jsx`
- **Test:** `frontend/src/features/tasks/components/chat/test/ChatFieldPaste.test.jsx`
- **Details:**
  - Add `onPaste` handler on the textarea:
    - Inspect `e.clipboardData.items` or `e.clipboardData.files`.
    - Filter for image files (`item.type.startsWith('image/')`).
    - If image files exist:
      - `e.preventDefault()`.
      - Validate through `checkFiles([...files, ...pastedImages])`.
      - If valid, update `files` state; if invalid, set `fileError`.
  - Update textarea style:
    - Expand `maxHeight` from `calc(2lh + ...)` to `180px`.
    - Set `minHeight: "44px"`, `lineHeight: "1.375rem"`.

### Task 5: Verification & Regressions
- Run Vitest suite: `pnpm test` in `frontend/`.
- Run ESLint: `pnpm run lint` in `frontend/`.
- Run TypeScript / Vite build: `pnpm run build` in `frontend/`.

