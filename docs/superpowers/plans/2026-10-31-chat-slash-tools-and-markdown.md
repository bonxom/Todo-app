# Chat Slash Tools Suggestion & Markdown Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement slash-command (`/`) tool suggestions with highlighted chip/badge insertion in the chat input, and complete Markdown parsing (bold, italic, inline code) across all chat messages.

**Architecture:** A lightweight tool catalog provides metadata for core Orbit tools and specialist skills. A `SlashCommandMenu` floating menu detects `/` trigger in `ChatField`, allowing keyboard and mouse selection that pins a styled `ToolBadge` chip to the input instead of raw text. An enhanced `MarkdownText` parser tokenizer handles bold, italic, and inline code formatting for both bot and user messages.

**Tech Stack:** React 19, Tailwind CSS 4, Lucide React icons, Vitest, React Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-31-chat-slash-tools-and-markdown.md](../specs/2026-10-31-chat-slash-tools-and-markdown.md)

## Global Constraints

- Keep changes scoped to frontend (`frontend/src/features/tasks/components/chat/` and tests).
- Preserve existing Ask/Auto mode toggles, attachment toolbar, and interaction card behavior.
- Support theme tokens (`var(--color-accent)`, `var(--color-surface)`, `var(--color-line)`, etc.).
- Maintain zero TypeScript errors and ensure all relevant test suites pass cleanly.

## Review Focus

1. Pressing `Enter` when slash suggestions are visible must select the active tool, NOT submit the chat form.
2. Pressing `Backspace` when the input textarea is empty must delete the selected tool badge.
3. Complex markdown combining bold, italic, and inline code must render without corrupted tags or broken table formatting.
4. Messages with tool badges must display cleanly in user message bubbles with the badge highlighted.
5. If the user types `/` in the middle of a word (e.g. `http://example`), it should not falsely trigger the slash menu.

---

### Task 1: Rich Markdown Formatting (Inline Code, Italic, Bold) in `MarkdownText`

**Files:**
- Modify: `frontend/src/features/tasks/components/chat/MarkdownText.jsx`
- Modify: `frontend/src/features/tasks/components/chat/ChatField.jsx:108-114`
- Test: `frontend/src/features/tasks/components/test/MarkdownText.test.jsx`

**Interfaces:**
- `MarkdownText`: component accepting `{ text: string }`
- Parses `**bold**`, `*italic*`, `_italic_`, and `` `code` `` in text blocks and table cells.

- [x] **Step 1: Write failing tests for italic and inline code in `MarkdownText.test.jsx`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement enhanced Markdown parser in `MarkdownText.jsx`**
- [x] **Step 4: Run tests to verify they pass**

---

### Task 2: Tool Catalog & `SlashCommandMenu` Component

**Files:**
- Create: `frontend/src/features/tasks/components/chat/toolCatalog.js`
- Create: `frontend/src/features/tasks/components/chat/SlashCommandMenu.jsx`
- Test: `frontend/src/features/tasks/components/test/SlashCommandMenu.test.jsx`

**Interfaces:**
- `toolCatalog`: Array of objects `{ id: string, name: string, description: string, category: 'core' | 'skill', iconName: string }`
- `SlashCommandMenu`: component accepting `{ query: string, onSelect: (tool) => void, onClose: () => void }`

- [x] **Step 1: Write failing tests for `SlashCommandMenu`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement `toolCatalog.js` and `SlashCommandMenu.jsx`**
- [x] **Step 4: Run test to verify it passes**

---

### Task 3: Slash Trigger & Tool Badge Integration in `ChatField`

**Files:**
- Modify: `frontend/src/features/tasks/components/chat/ChatField.jsx`
- Test: `frontend/src/features/tasks/components/test/ChatField.test.jsx`

**Interfaces:**
- `ChatField` state:
  - `selectedTool`: `Tool | null`
  - `slashQuery`: `string | null` (non-null when `/` trigger active)
  - `SlashCommandMenu` rendered when `slashQuery !== null`
  - Input shows `ToolBadge` when `selectedTool !== null` with remove `✕` button.

- [x] **Step 1: Write failing tests for slash tool selection and badge removal in `ChatField.test.jsx`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement slash menu and tool badge inside `ChatField.jsx`**
- [x] **Step 4: Run test to verify it passes**

---

### Task 4: Full Verification & Lint

- [ ] **Step 1: Run frontend test suites**
Run: `cd frontend && pnpm vitest run src/features/tasks/components/test/`
Expected: All tests pass.

- [ ] **Step 2: Run frontend build and typecheck**
Run: `cd frontend && pnpm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Run frontend linter**
Run: `cd frontend && pnpm run lint`
Expected: 0 lint errors.
