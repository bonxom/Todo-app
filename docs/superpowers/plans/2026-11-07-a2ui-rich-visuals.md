# A2UI Rich Visual Components & Design Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Stat`, `Chart`, and `Diagram` components plus `Card` headers/tones to the A2UI composition catalog, and redesign A2UI + Task Proposal styles to match Orbit's design system.

**Architecture:** Extend the backend and frontend A2UI v0.9 composition schemas and compiler (`IUiSurface.ts`, `uiSurfaceValidation.ts`, `uiSurfaceService.ts`, `compositionSchema.ts`) with `Stat`, `Chart`, `Diagram`, and optional `Card` header/tone properties. Implement the corresponding React catalog components in `presentationComponents.tsx` (using responsive SVG/conic-gradient charts and the existing `MermaidDiagram`), upgrade `composition.css` and `taskProposal.css` to Orbit's theme tokens, and update `ui-composition/SKILL.md`.

**Tech Stack:** TypeScript, Node 22, Zod 4 (backend) / Zod 3 (frontend), React 19, `@a2ui/react`, `@a2ui/web_core`, Mermaid, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-a2ui-rich-visuals-design.md`

## Global Constraints

- Catalog ID remains `urn:orbit:a2ui:composition:v1` with A2UI `v0.9` envelope messages.
- `backend/skills/content/ui-composition/SKILL.md` must remain `<= 10,000` characters (`MAX_DOCUMENT_CHARS`).
- Preserve relative `.js` import suffixes in backend TypeScript (`NodeNext`).
- Preserve all existing accessibility labels (`aria-label`, `role="status"`, `role="alert"`, `<fieldset>`/`<legend>`) in `TaskList.tsx` and `TaskProposalActions.tsx`.

---

### Task 1: Backend Schema, Compiler & Skill Guidance for `Card`, `Stat`, `Chart`, and `Diagram`

**Files:**

- Modify: `backend/types/A2UI/IUiSurface.ts`
- Modify: `backend/validations/A2UI/uiSurfaceValidation.ts`
- Modify: `backend/services/A2UI/uiSurfaceService.ts`
- Modify: `backend/skills/content/ui-composition/SKILL.md`
- Test: `backend/validations/test/uiSurfaceValidation.test.ts`
- Test: `backend/services/test/uiSurface.test.ts`
- Test: `backend/services/test/agentUiCapability.test.ts`

**Interfaces:**

- Produces:
  - `UiTone = "default" | "accent" | "success" | "warning" | "danger"`
  - `CardTone = "default" | "accent" | "muted"`
  - `ChartType = "bar" | "line" | "doughnut"`
  - `ChartSeriesSpec = { key: string; label: string }`
  - Extended `UiNode` union with `Card` (`title?`, `subtitle?`, `tone?`), `Stat`, `Chart`, and `Diagram`.

- [x] **Step 1: Write failing backend validation & compiler tests**
  - Add test cases in `backend/validations/test/uiSurfaceValidation.test.ts` and `backend/services/test/uiSurface.test.ts` verifying:
    - Valid `Card` with `title`, `subtitle`, `tone`, plus `Stat`, `Chart` (`bar`, `line`, `doughnut`), and `Diagram` nodes pass `parseSurfaceSpec` and `compileSurface`.
    - Invalid `Chart` bindings (missing `labelKey`, non-numeric series values, duplicate series keys, multi-series `doughnut`, negative `doughnut` values) and invalid `Diagram` bindings (non-string or blank Mermaid source) are rejected.

- [x] **Step 2: Run backend tests to verify they fail**
  - Run: `cd backend && pnpm exec vitest run validations/test/uiSurfaceValidation.test.ts services/test/uiSurface.test.ts`

- [x] **Step 3: Implement backend types, validation, compiler, and `SKILL.md` updates**
  - Update `backend/types/A2UI/IUiSurface.ts`, `backend/validations/A2UI/uiSurfaceValidation.ts`, `backend/services/A2UI/uiSurfaceService.ts`, and `backend/skills/content/ui-composition/SKILL.md`.

- [x] **Step 4: Run backend tests to verify they pass**
  - Run: `cd backend && pnpm exec vitest run validations/test/uiSurfaceValidation.test.ts services/test/uiSurface.test.ts services/test/agentUiCapability.test.ts`

---

### Task 2: Frontend Schema, Visual Catalog Components (`Stat`, `Chart`, `Diagram`, `Card`) & Orbit Styling

**Files:**

- Modify: `frontend/src/shared/types/A2UI/uiSurface.ts`
- Modify: `frontend/src/shared/A2UI/compositionSchema.ts`
- Modify: `frontend/src/shared/A2UI/presentationComponents.tsx`
- Modify: `frontend/src/shared/A2UI/composition.css`
- Modify: `frontend/src/features/tasks/components/chat/A2UI/TaskList.tsx`
- Modify: `frontend/src/features/tasks/components/chat/A2UI/TaskProposalActions.tsx`
- Modify: `frontend/src/features/tasks/components/chat/A2UI/taskProposal.css`
- Test: `frontend/src/shared/A2UI/test/compositionProtocol.test.tsx`
- Test: `frontend/src/features/tasks/components/test/TaskComposition.test.tsx`

**Interfaces:**

- Consumes: Compiled v0.9 A2UI envelopes containing `Card`, `Stat`, `Chart`, `Diagram`, `Text`, `Table`, `Column`, `Row`, `TaskList`, `TaskProposalActions`, `TaskProposalForm`.
- Produces: Updated `presentationComponents` array and `validateCompositionPayload` supporting `Stat`, `Chart`, `Diagram`, and enhanced `Card`.

- [x] **Step 1: Write failing frontend protocol and rendering tests**
  - Add tests in `frontend/src/shared/A2UI/test/compositionProtocol.test.tsx` covering:
    - Rendering `Card` (`title`, `subtitle`, `tone`), `Stat` (value, caption, progress bar), `Chart` (`bar`, `line`, `doughnut`), and `Diagram` (Mermaid).
    - Client-side validation rejection for non-numeric `Chart` series data, multi-series `doughnut`, and non-string `Diagram` bindings.

- [x] **Step 2: Run frontend tests to verify they fail**
  - Run: `cd frontend && pnpm exec vitest run src/shared/A2UI/test/compositionProtocol.test.tsx`

- [x] **Step 3: Implement frontend schema, components, and Orbit CSS redesign**
  - Update `frontend/src/shared/types/A2UI/uiSurface.ts`, `frontend/src/shared/A2UI/compositionSchema.ts`, `frontend/src/shared/A2UI/presentationComponents.tsx`, `frontend/src/shared/A2UI/composition.css`, `frontend/src/features/tasks/components/chat/A2UI/TaskList.tsx`, `frontend/src/features/tasks/components/chat/A2UI/TaskProposalActions.tsx`, and `frontend/src/features/tasks/components/chat/A2UI/taskProposal.css`.

- [x] **Step 4: Run frontend and backend verification suites**
  - Run:
    - `cd backend && pnpm test && pnpm run lint && pnpm run build`
    - `cd frontend && pnpm exec vitest run src/shared/A2UI/test/compositionProtocol.test.tsx src/features/tasks/components/test/TaskComposition.test.tsx src/features/tasks/components/test/UiSurfaceMessage.test.tsx && pnpm run lint && pnpm run build`
