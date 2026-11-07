# Custom morphing glow cursor

Approved direction: user requested and authorized implementation on 2026-11-07. Provide a solid circular custom cursor (no gradients) on fine-pointer desktop devices that morphs/snaps to interactive controls and cards and emits a glow around the hovered component.

## Behavior and acceptance criteria

1. **Device and motion gating:** The custom cursor mounts only when `window.matchMedia("(hover: hover) and (pointer: fine)")` is true and `window.matchMedia("(prefers-reduced-motion: reduce)")` is false. When active, `document.documentElement` receives class `has-custom-cursor` and the overlay renders via `createPortal` into `document.body` (or the active top-layer `dialog[open]`) with `z-index: 2147483647` so it remains above `#root` (`isolation: isolate`) and all modal portals (`FormDialog`, `GroupDetailModal`, `TaskListDetailModal`, `DescriptionEditor`); when inactive or unmounted, `has-custom-cursor` is removed and no cursor overlay DOM node is rendered.
2. **System cursor handling:** While `html.has-custom-cursor` is active on fine-pointer devices, the default arrow/hand cursor is hidden (`cursor: none !important`), except on text-entry controls (`input` excluding button/checkbox/radio/range/submit/reset types, `textarea`, `[contenteditable="true"]`) which retain `cursor: text !important`.
3. **Default circular dot (no gradients):** When moving across non-target areas, the cursor renders as a `14px × 14px` solid circular dot (`data-mode="dot"`, `border-radius: 9999px`) positioned at `(clientX, clientY)` with a solid theme-aware color (`var(--cursor-dot-bg)`) and zero `linear-gradient` or `radial-gradient` backgrounds.
4. **Morph & Wrap with Glow on controls and cards:**
   - Hovering an enabled interactive control (`button:not(:disabled)`, `a[href]`, `[role="button"]:not([aria-disabled="true"])`, `summary`, `[data-cursor-target="control"]`) or card container (`.ui-task-card`, `.category-card`, `.feature-card`, `.satellite-card`, `.a2ui-card`, `.todo-progress-card`, `[data-cursor-target="card"]`) transitions the cursor to `data-mode="snap"` (`data-snap-kind="control"` or `"card"`).
   - If the pointer is over an interactive control nested inside a card, the inner control takes precedence over the outer card; moving from the inner control back onto the card body snaps back to the card.
   - In `snap` mode, the cursor overlay adopts the target element's bounding box (`left`, `top`, `width`, `height` via `getBoundingClientRect()`) and computed `borderRadius`, rendering a solid translucent tint, solid border, and outer `box-shadow` glow (`var(--cursor-snap-glow)`).
5. **Text-input and lifecycle edge cases:**
   - Hovering a text-editable field switches the overlay to `data-mode="text"` (shrunk/hidden overlay) so the native I-beam caret remains unobstructed.
   - Pressing the pointer (`pointerdown`) sets `data-pressed="true"` until `pointerup` or `pointercancel`.
   - Leaving the viewport (`document` `mouseleave` / window `blur`) sets `data-visible="false"`.
   - Window `scroll` and `resize` events refresh the active snapped target's bounding rect if it remains connected in the DOM, or reset to `dot` mode if detached.
6. **Custom Select dropdown (`CustomSelect`):**
   - Replace native OS `<select>` menus in task forms (`AddTaskForm`, `TaskDetailForm`, `AddTaskField`, `FilterBar`), toolbar/pagination/category/agent selectors (`TodoTaskToolbar`, `Pagination`, `CategoryPage`, `AgentContextPanel`, `TaskList`) with `CustomSelect`.
   - Render a styled trigger button (`data-cursor-target="control"`) with single clean border, selected option label, and rotating `ChevronDown` indicator, plus a synchronized native `<select>` for label/test/form compatibility.
   - Open a portaled custom menu (`role="listbox"`, `z-index: 10000`) styled with theme surface/border/shadow tokens and rounded option buttons (`role="option"`, `data-cursor-target="control"`), supporting selected checkmarks, action options (`+ Add more` / `+ Add project` divider + accent style), disabled options, outside-click/Escape dismissal, and custom cursor morphing on each option.

## Scope

Frontend only. Implemented via shared `CustomCursor` and `CustomSelect` components in `frontend/src/shared/components/` and styled in `frontend/src/styles/index.css`. No backend changes, no new external dependencies, and no gradient fills.

## Test and verification

Unit/component tests in `frontend/src/shared/components/test/CustomCursor.test.tsx` and `frontend/src/shared/components/test/CustomSelect.test.tsx` verify fine-pointer and reduced-motion gating, `has-custom-cursor` root class management, free-floating dot coordinates, morphing into buttons and cards (including nested button-in-card priority), text input suppression, press state, viewport leave cleanup, and `CustomSelect` menu open/select/action/keyboard/disabled behavior. Run full frontend test suite, lint, scoped Prettier check, frontend build, and backend minimum verification.
