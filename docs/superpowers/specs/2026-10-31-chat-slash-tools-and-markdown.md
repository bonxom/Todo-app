# Specification: Chat Slash Tools Suggestion & Markdown Formatting

- **Date:** 2026-10-31
- **Feature:** Chat Slash Tools Suggestion & Markdown Rendering
- **Status:** Approved for Implementation

---

## 1. Problem Statement & Motivation

1. **Agent Tool Discoverability & Precision**: In the chat panel (`ChatField.jsx`), users interact with an agentic AI assistant capable of running core tools (task creation, updates, category and project lookups) and specialized advisory skills (gym routines, IELTS coaching). Currently, users must infer what the agent can do or type natural language prompts from scratch. Typing `/` should trigger an instant suggestion list of available tools and skills (like slash commands in modern coding agents).
2. **Visual Affordance (Pill/Badge instead of Raw Text)**: When a tool is selected from the slash menu, inserting raw text like `"/orbit_create_task "` looks messy and is prone to accidental partial deletion or confusion. Instead, it should be visually represented as a prominent, highlighted badge/chip (`[⚡ orbit_create_task ✕]`) pinned inside the input area, allowing the user to seamlessly type their prompt afterward and dismiss it easily with `Backspace` or a click.
3. **Markdown Formatting Completeness**: Currently, `MarkdownText.jsx` only parses `**bold**` and tables. It does not render inline code (`` `code` ``) or italic text (`*italic*` / `_italic_`). Furthermore, user message bubbles display raw text without Markdown rendering. When users paste or type formatted text (e.g. `*abc*` for italic or `` `abc` `` for inline code), it should render with proper typography.

---

## 2. Requirements & Acceptance Criteria

### AC01: Slash Command Trigger & Menu
- When the user types `/` in the chat textarea (either at the start of input or after a space), a floating suggestion popup appears above the input box.
- The menu lists all available tools and skills:
  - `orbit_create_task`: Tạo task mới (kèm hạn chót, danh mục, ưu tiên)
  - `orbit_list_tasks`: Tra cứu, xem danh sách công việc
  - `orbit_update_task`: Cập nhật trạng thái hoặc nội dung công việc
  - `orbit_get_task`: Xem chi tiết một công việc
  - `orbit_list_categories`: Xem danh sách danh mục
  - `orbit_list_projects`: Xem danh sách dự án
  - `orbit_get_me`: Xem thông tin tài khoản người dùng
  - `gym`: Lên lịch tập gym & dinh dưỡng thể hình
  - `ielts`: Luyện thi, bài tập và chấm điểm IELTS
- Typing additional characters after `/` (e.g., `/task`, `/gym`) filters the list dynamically by matching tool ID, label, or description (case-insensitive).
- Keyboard navigation:
  - `ArrowDown` / `ArrowUp` navigates through the suggestion list.
  - `Enter` or `Tab` selects the highlighted tool.
  - `Escape` closes the suggestion popup without selecting.
  - Mouse click selects an item.

### AC02: Tool Badge in Chat Input
- Upon selecting a tool:
  - The slash trigger text (e.g. `/` or `/task`) is removed from the textarea.
  - A prominent highlighted Badge/Chip is rendered inside or directly above the input box (e.g., displaying an icon, tool name, and a remove `✕` button).
  - The badge uses the design system's accent styling: e.g. `border border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] font-medium rounded-lg px-2.5 py-1 text-xs`.
  - Focus returns to the textarea so the user can immediately continue typing their prompt.
  - If the user presses `Backspace` when the textarea is empty, the tool badge is removed.
  - Clicking the `✕` button on the badge removes the selected tool.
  - Only one tool badge can be attached per message.

### AC03: Message Dispatch & Display
- When submitting a message with an attached tool badge:
  - The prompt sent to the backend includes clear guidance/marker for the selected tool (e.g. `[Tool: orbit_create_task] <user message>`), instructing the model to leverage this specific tool/skill.
  - The user's chat bubble displays the tool badge prominently alongside their message text.
  - After submission, the input area clears both the badge and the text.

### AC04: Markdown Parsing & Formatting
- `MarkdownText.jsx` supports:
  - Bold: `**bold**` -> `<strong className="font-semibold">`
  - Italic: `*italic*` or `_italic_` -> `<em className="italic">`
  - Inline code: `` `code` `` -> `<code className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-accent-strong)] border border-[var(--color-line)]">`
  - Markdown tables (preserves existing table support).
- Both bot messages and user messages in `ChatField.jsx` are parsed with `MarkdownText`.

---

## 3. UI/UX Specifications

- **Slash Menu Popup**:
  - Located directly above the input toolbar (`bottom-full mb-2`).
  - Max height: 260px, scrollable.
  - Card style: `bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl shadow-lg p-1.5`.
  - Each item: `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors`. Active/focused item has `bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]`.
  - Item shows tool icon (Wrench / Sparkles / Dumbbell / GraduationCap), human-readable label/title, and muted description.

- **Input Tool Badge**:
  - Pinned directly inside the input container or at the top of the input area.
  - Layout: `inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-strong)]`.
  - Delete icon: `lucide-react/X` button with `hover:bg-[var(--color-accent)]/20 rounded`.

---

## 4. Testable Edge Cases

1. Typing `/` followed by characters with no matches shows an empty state or closes cleanly.
2. Pressing `Escape` closes the suggestion list without losing typed text.
3. Pressing `Enter` when suggestion menu is open selects the item without submitting the chat form.
4. Pressing `Enter` when suggestion menu is closed submits the chat form.
5. `Backspace` when textarea is empty deletes the attached tool badge.
6. Typing backticks `` `test` `` renders as `<code>test</code>`.
7. Typing asterisks `*test*` or underscores `_test_` renders as `<em>test</em>`.
8. Combined markdown (e.g. `**bold** and *italic* and `code``) parses correctly without escaping bugs or infinite loops.
9. Table parsing remains intact.
