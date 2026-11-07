# Custom Morphing Glow Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a solid circular desktop cursor that morphs into hovered buttons/cards with a solid-color glow while preserving native text-input carets and reduced-motion/touch accessibility.

**Architecture:** Mount a lightweight `CustomCursor` overlay inside `App.tsx` that tracks pointer events and target bounds (`getBoundingClientRect()` + computed `borderRadius`), updating inline positioning/sizing variables and `data-mode` attributes without gradients. Style the dot, morph transition, glow (`box-shadow`), and native cursor suppression rules in `frontend/src/styles/index.css`.

**Tech Stack:** React 19, TypeScript, CSS custom properties (`index.css`), Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-07-custom-cursor.md`

## Global Constraints

- Solid colors only for the cursor dot, snapped overlay, and glow (`box-shadow`); do not use `linear-gradient` or `radial-gradient`.
- Activate only when `(hover: hover) and (pointer: fine)` matches and `(prefers-reduced-motion: reduce)` does not match.
- Hide system cursor via `html.has-custom-cursor`, except on editable text inputs/textareas where `cursor: text` is preserved.
- Inner interactive controls (`button`, `a[href]`, `[role="button"]`, `summary`) inside cards take priority over the outer card container.
- No new npm dependencies.

---

### Task 1: CustomCursor component, styles, and unit tests

**Files:**

- Create: `frontend/src/shared/components/CustomCursor.tsx`
- Modify: `frontend/src/app/App.tsx`
- Modify: `frontend/src/styles/index.css`
- Test: `frontend/src/shared/components/test/CustomCursor.test.tsx`

**Interfaces:**

- Produces: `export default function CustomCursor(): JSX.Element | null` in `frontend/src/shared/components/CustomCursor.tsx`.

- [x] **Step 1: Write the failing unit tests in `frontend/src/shared/components/test/CustomCursor.test.tsx`**

Cover:

1. Renders nothing and does not add `has-custom-cursor` when `prefers-reduced-motion: reduce` is active or `(hover: hover) and (pointer: fine)` is false.
2. Adds `has-custom-cursor` to `document.documentElement` when fine pointer is enabled, and tracks pointer movement in `data-mode="dot"` at pointer coordinates.
3. Morphs (`data-mode="snap"`, `data-snap-kind="card"` or `"control"`) to match target `getBoundingClientRect()` and computed `borderRadius` when hovering a card (`.ui-task-card`) or button (`<button>`), giving priority to a button nested inside a card.
4. Switches to `data-mode="text"` when hovering an editable `<input type="text">` or `<textarea>`.
5. Sets `data-pressed="true"` on pointer press and clears it on release, hides (`data-visible="false"`) when leaving the document, and updates/resets bounds on `scroll`.

- [x] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/shared/components/test/CustomCursor.test.tsx`
Expected: FAIL because `CustomCursor.tsx` does not exist yet.

- [x] **Step 3: Implement `CustomCursor.tsx`, mount in `App.tsx`, and add styles in `index.css`**

Implement `CustomCursor.tsx` with target detection (`control`, `card`, `text`, or `dot`), bounding-rect snapping, scroll/resize updates, and media-query listeners. Mount `<CustomCursor />` in `frontend/src/app/App.tsx`. Add solid-color cursor variables and `.custom-cursor` rules in `frontend/src/styles/index.css`.

- [x] **Step 4: Run the unit tests to verify they pass**

Run: `cd frontend && pnpm exec vitest run src/shared/components/test/CustomCursor.test.tsx`
Expected: PASS

---

### Task 2: Full regression, lint, formatting, and build verification

**Files:**

- Modify: `docs/superpowers/plans/2026-11-07-custom-cursor.md`

- [x] **Step 1: Run full frontend test suite and lint**

Run: `cd frontend && pnpm test && pnpm run lint`
Expected: PASS

- [x] **Step 2: Run Prettier check on changed files**

Run: `cd frontend && pnpm exec prettier --check src/shared/components/CustomCursor.tsx src/shared/components/test/CustomCursor.test.tsx src/app/App.tsx src/styles/index.css`
Expected: PASS

- [x] **Step 3: Run frontend build and backend verification**

Run: `cd frontend && pnpm run build && cd ../backend && pnpm run build && pnpm test`
Expected: PASS

## Verification Record

- `cd frontend && pnpm exec vitest run src/shared/components/test/CustomCursor.test.tsx`: 5 passed (after confirming initial RED failure before `CustomCursor.tsx` existed).
- `cd frontend && pnpm test`: 63 test files / 303 tests passed.
- `cd frontend && pnpm run lint`: passed with 0 errors and 0 warnings.
- `cd frontend && pnpm exec prettier --check src/shared/components/CustomCursor.tsx src/shared/components/test/CustomCursor.test.tsx src/app/App.tsx src/styles/index.css ../docs/superpowers/specs/2026-11-07-custom-cursor.md ../docs/superpowers/plans/2026-11-07-custom-cursor.md`: passed.
- `cd frontend && pnpm run build`: TypeScript (`tsc -b`) and Vite production bundle succeeded (existing dynamic/static `ErrorPage.jsx` import and >500 kB chunk warnings remain unchanged).
- `cd backend && pnpm run build && pnpm test`: TypeScript (`tsc --noEmit`) passed; 50 test files / 422 tests passed, 8 test files / 83 tests skipped (Mongo integration environment not configured).
