# Liquid Glass refinement and independent V2 workflows

Date: 2026-11-15. Status: approved direction; implementation authorized.

This specification supersedes conflicting visual and V1-handoff requirements in the [foundation specification](2026-11-14-frontend-v2-liquid-glass.md). Shared authentication, data, route guards, version preference, and URL precedence remain unchanged.

## Approved direction

The user approved a fine horizontal/vertical grid background, stronger glass materials, and independent presentation versions. The version switcher is the only ordinary UI control that navigates between versions. Remove V1 badges, V1 navigation destinations, management/edit handoffs, and version commentary in empty states. Keep the shared backend, hooks, stores, and authentication.

Only implemented V2 pages appear in navigation. Dashboard remains the only page in this release. Do not add disabled future navigation or link to an unimplemented page. The switcher remains visible; sign-out and public authentication are not cross-version navigation. Infrastructure recovery from a broken lazy chunk may retain its emergency HTML escape to the stable application; it is not normal product navigation.

## Visual contract

- Static square grid with 48px spacing, 1px lines, low contrast; use two linear gradients behind the interface. Add large, quiet mint/blue light fields to make transparent material legible. No moving grid or image download.
- Floating navigation rail and topbar inset from viewport edges. Use rounded surfaces, directional edge highlights, inner reflection, and soft elevation shadows. The active navigation item appears as a small lens.
- Distinguish clear shell glass (approximately 45–60% light fill, 50–70% dark fill), frosted content panels (65–80%), and near-opaque form controls. Tune these ranges against readability, not as a reason to sacrifice contrast.
- The grid must remain visible outside surfaces and be visibly softened under shell glass. Blur alone does not satisfy acceptance. Use 18–24px backdrop blur on major surfaces, never on every task row.
- Main content has a confident heading, small supporting copy, native New task action, a compact summary band, and one coherent task-list surface. Avoid a wall of identical cards, excessive badges, or large empty sidebar space.
- Use a mist-blue/light mint palette and deep blue-green dark mode. Retain readable text, controlled accents, system font stacks, and no additional dependencies.
- All selectors/tokens remain V2-scoped. Preserve V1 styles and existing theme/language persistence. Provide opaque no-blur fallback, reduced-motion/transparency behavior, forced colors, visible keyboard focus, and 44px touch targets.
- Verify 360×800, 768×1024, 1440×900 in light/dark. No page overflow or clipped switcher. Dialogs must be above the topbar and keyboard usable.

## Native create/edit tasks

Add a V2 form inside the existing V2 dialog; do not embed V1 form UI. New task is accessible from the dashboard heading and empty state. Edit is accessible inside task details. No navigation away from `/v2/*` is needed.

Fields: title, description, priority (Low/Medium/High), category, optional project, optional start date, optional due date. Title is trimmed, nonempty, maximum 200 characters; description maximum 1000. Use existing date conversion utilities. Do not submit invalid date strings. The server remains authoritative for dates/ownership/status rules.

Use `useCategoriesQuery`, `useProjectsQuery`, `useCreateTaskMutation`, and `useUpdateTaskMutation`. Category omitted on create uses backend Uncategorized resolution; optional project omitted on create, `null` when explicitly removed on edit. Dates are ISO values when set and `null` when explicitly cleared on edit; unchanged edit fields are omitted. Preserve existing task status rather than inventing a create status. Only active projects can receive new assignments; an existing completed project can remain unchanged.

Loading choices must not silently erase assignments. Surface choice-fetch failures with retry. Disable save while initial choices load or fail. On edit retain original IDs even if an option is absent; unchanged values must not be accidentally cleared. Prevent duplicate submission, show inline API errors while retaining input, close on success after shared invalidation, and retain cache/session across version switching. Refetches must not overwrite an open form's draft. Cancel/close a dirty form requires an explicit discard decision. Do not allow dismissal during a pending save.

Delete, restore, give-up, project/category creation, and other V2 pages remain outside scope. Do not show dead controls for them.

## Acceptance

| ID  | Requirement                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| R1  | Grid, floating shell, edge reflection and translucency are visibly identifiable in light/dark screenshots.             |
| R2  | Normal V2 navigation and content contain no V1 destinations or badges; the switcher alone crosses versions.            |
| R3  | Create and edit work inside V2 with real shared hooks, correct payloads, validation and cache invalidation.            |
| R4  | Loading/error/duplicate-submit/dirty-cancel/assignment/date-clearing cases have automated coverage.                    |
| R5  | Desktop/mobile/tablet, dialogs, keyboard, theme/localization and reduced-motion/fallback remain usable.                |
| R6  | Existing V1 and V2 behavior remains covered; report exact tests, lint, format and builds, including baseline failures. |

Use browser screenshots and workflow tests as acceptance evidence, not CSS inspection alone. Mocked browser tests demonstrate UI behavior; they do not prove live backend persistence.

## Component material refinement (user reference, 2026-11-15)

The user's supplied comparison table further specifies the approved visual target:

| Component  | Required treatment                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Topbar     | Bright upper edge, directional reflection and layered soft shadows; avoid flat frosted paint.                                               |
| Sidebar    | More transparent fill with a subtle refractive-looking rim. Use lightweight CSS optical cues, not physically accurate real-time refraction. |
| Statistics | Graded glass transparency and inner highlights instead of uniform white cards.                                                              |
| Task panel | Slight elevation with reduced blur; retain text contrast.                                                                                   |
| Buttons    | Glass hover and a restrained specular highlight, with reduced-motion support.                                                               |

Keep these treatments distinct, localized and readable. No continuously animated shine. Their implementation remains in V2 styles. A narrow V1 topbar integration correction is allowed because regression tests demonstrate the foundation switcher overflows at 320/390px; preserve existing controls and reserve sufficient header space.
