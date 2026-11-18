# Statistics v2 Liquid Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional `/v2/statistics` page matching the approved liquid glass direction.

**Architecture:** Keep V1 presentation untouched. Compose V2-specific panels over the existing stats queries and date helpers; isolate range validation and aggregation in a pure TypeScript model. Integrate the page into V2 navigation and the shared version mapping.

**Tech Stack:** React 19, TypeScript, TanStack Query, Chart.js/react-chartjs-2, existing V2 CSS tokens, i18next, Vitest/Testing Library and Playwright.

**Spec:** [Statistics v2 specification](../specs/2026-11-18-v2-statistics-liquid-glass.md).

**Status:** Completed and fully verified, 2026-11-18. All planned implementation tasks, unit/integration tests, E2E browser journeys, lint, prettier format checks, frontend and backend production builds have been executed and passed.

## Global Constraints

- Use pnpm@11.21.0 only; frontend and backend remain separate packages.
- Use existing React 19, TypeScript, Chart.js, TanStack Query, Vitest and Playwright tooling; add no dependencies.
- Reuse existing stat queries, service and date helpers; do not change API contracts or query keys.
- Keep V1 Statistics components and CSS unchanged; scope new styling under `.v2-statistics` and `.v2-statistics-*`.
- Use V2 theme tokens and existing heading/body fonts; all new visible copy and accessible labels support English and Vietnamese.
- Follow Test -> Code -> Test -> Lint -> Format check -> Build/type-check after the spec and plan are approved for execution.

## Workspace and baseline

Worktree: `/home/bonxom/.codex/worktrees/7b00/TodoApp`, branch `feat/v2-statistics-liquid-glass`, created from `6bbc2bd`. Use this path explicitly; preserve the source checkout. Inspect worktree state and instructions again before execution.

- [x] Run `git status --short` and confirm intended branch with `git branch --show-current`.
- [x] Run `corepack enable` if needed, then `pnpm install --frozen-lockfile` separately in `frontend/` and `backend/`. No secrets or real `.env` files are needed for mocked tests.
- [x] Establish baseline: frontend `pnpm test`, `pnpm run lint`, `pnpm run format:check`, `pnpm run build`; backend `pnpm run build`, `pnpm test`. Record pre-existing failures separately and resolve task-related failures before claiming completion.

## File map

All paths below are relative to the worktree root.

| File                                                                      | Responsibility                                           |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `frontend/src/features/v2/pages/StatisticsPage.tsx`                       | Query lifecycle and page composition                     |
| `frontend/src/features/v2/components/statistics/StatisticsOverview.tsx`   | Counts and accessible completion track                   |
| `frontend/src/features/v2/components/statistics/StatisticsTrend.tsx`      | Draft/applied ranges, Chart.js and textual totals        |
| `frontend/src/features/v2/components/statistics/StatisticsActivity.tsx`   | Heatmap selection, activity query and focus restoration  |
| `frontend/src/features/v2/components/statistics/StatisticsBreakdowns.tsx` | Status/category donuts and legends                       |
| `frontend/src/features/v2/components/statistics/statisticsModel.ts`       | Typed validation, trend series and breakdown aggregation |
| `frontend/src/features/v2/styles/statistics.css`                          | Scoped responsive glass presentation                     |
| `frontend/src/features/v2/routes.tsx`                                     | Lazy page registration                                   |
| `frontend/src/features/v2/components/V2Sidebar.tsx`                       | Statistics navigation                                    |
| `frontend/src/features/v2/components/V2Topbar.tsx`                        | Statistics section title                                 |
| `frontend/src/shared/navigation/uiVersions.ts`                            | Exact route support and version destination              |
| `frontend/src/shared/i18n/locales/{en,vi}/v2.json`                        | New labels, messages and accessible copy                 |
| `frontend/src/features/v2/test/statisticsModel.test.ts`                   | Date/range/aggregation tests                             |
| `frontend/src/features/v2/test/StatisticsPage.test.tsx`                   | Service-backed component integration tests               |
| `frontend/src/shared/navigation/test/uiVersions.test.ts`                  | Statistics mapping regression tests                      |
| `frontend/src/features/v2/test/StatisticsNavigation.test.tsx`             | Sidebar/topbar integration                               |
| `frontend/e2e/v2-statistics.spec.ts`                                      | Browser journeys and screenshots                         |

Read-only references: `features/statistics/api/statQueries.ts`, `features/statistics/components/statsUtils.js`, `shared/services/statService.ts`, `shared/types/domain.ts`, `features/v2/components/GlassPanel.tsx`, `features/v2/test/testSupport.tsx`, `e2e/dashboard.fixture.ts`, `e2e/statistics.spec.ts`. Do not import V1 presentation or its stylesheet into V2.

## Task 1: Pure analytics model (AC03–AC06, AC08)

**Files:** Create `statisticsModel.ts` and `statisticsModel.test.ts` at the paths above.

**Interfaces:** Import `Stat` and `DailyStat` from `@/shared/types/domain`; reuse date helpers from `@/features/statistics/components/statsUtils`.

```ts
export type DateRange = { start: string; end: string };
export type RangeError =
  "required" | "invalid" | "reversed" | "future" | "tooLong";
export type RangeValidation =
  { valid: true; range: DateRange } | { valid: false; error: RangeError };
export type BreakdownItem = {
  key: string;
  label: string;
  value: number;
  percentage: number;
};
export function validateRange(range: DateRange, today: string): RangeValidation;
export function presetRange(days: 7 | 14 | 30 | 90, today: string): DateRange;
export function completionRate(stats: Stat): number;
export function buildTrend(
  dailyStats: DailyStat[],
  range: DateRange,
): {
  dateKeys: string[];
  completed: number[];
  givenUp: number[];
  completedTotal: number;
  givenUpTotal: number;
  hasHistory: boolean;
};
export function buildCategories(dailyStats: DailyStat[]): BreakdownItem[];
export function buildStatuses(stats: Stat): BreakdownItem[];
```

- [x] Write tests before creating the model. Start with the following executable assertions, then add all cases listed below.

```ts
import { describe, expect, it } from "vitest";
import {
  presetRange,
  validateRange,
  completionRate,
  buildCategories,
} from "../components/statistics/statisticsModel";

describe("statistics model", () => {
  it("uses inclusive preset boundaries", () => {
    expect(presetRange(7, "2026-11-18")).toEqual({
      start: "2026-11-12",
      end: "2026-11-18",
    });
  });
  it("rejects impossible and reversed dates", () => {
    expect(
      validateRange({ start: "2026-02-30", end: "2026-03-01" }, "2026-11-18"),
    ).toEqual({ valid: false, error: "invalid" });
    expect(
      validateRange({ start: "2026-11-18", end: "2026-11-17" }, "2026-11-18"),
    ).toEqual({ valid: false, error: "reversed" });
  });
  it("handles an empty overview and empty categories", () => {
    expect(
      completionRate({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        givenUpTasks: 0,
        dailyStats: [],
      }),
    ).toBe(0);
    expect(buildCategories([])).toEqual([]);
  });
});
```

- [x] Add cases for all presets; empty date; future end; valid single day; leap day; 366 accepted/367 rejected; 128/96 => 75%; clamp over-100 rendering; missing-day zeros; duplicate daily keys summed; empty history versus zero activity in range; category repeated names and deterministic tie order; zero-count omission and percentage sum; status keys independent of translated labels. Use a fixed today string rather than machine time.
- [x] Run `pnpm exec vitest run src/features/v2/test/statisticsModel.test.ts` from frontend. Record the expected missing-module failure before implementing.
- [x] Implement exact calendar-date validation using an ISO round-trip check before calling range helpers; validate the maximum span before generating arrays. Return error codes for translation by the view. Normalize daily records and sum duplicate date keys. Use stable status keys `pending`, `in-progress`, `completed`, `given-up`; labels are translated by the view. Category keys equal categoryName; do not claim grouping by ID.
- [x] Rerun the model test, fix failures and commit only the model/test files when execution is authorized.

## Task 2: Overview, query states and breakdowns (AC03, AC08, AC09)

**Files:** Create page, Overview, Breakdowns, stylesheet and `StatisticsPage.test.tsx`; modify both V2 locale files.

**Interfaces:** `StatisticsOverview({ stats }: { stats: Stat })`; `StatisticsBreakdowns({ stats }: { stats: Stat })`; default page consumes `useStatsQuery()` and composes the panels. Components use the pure model; no direct HTTP calls.

- [ ] Mock `statService` with `vi.mock('@/shared/services/statService')` and use `renderWithProviders` / `resetTestSession` from `./testSupport`. Write this initial integration case before the page exists:

```tsx
it("renders the all-time completion rate from the API", async () => {
  vi.mocked(statService.getUserStats).mockResolvedValue({
    totalTasks: 128,
    completedTasks: 96,
    inProgressTasks: 18,
    pendingTasks: 10,
    givenUpTasks: 4,
    dailyStats: [],
  });
  renderWithProviders(<StatisticsPage />, {
    initialEntries: ["/v2/statistics"],
  });
  expect(
    await screen.findByRole("heading", { name: "Statistics", level: 1 }),
  ).toBeVisible();
  await waitFor(() =>
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "75",
    ),
  );
  expect(screen.getByRole("link", { name: "View tasks" })).toHaveAttribute(
    "href",
    "/v2/dashboard",
  );
});
```

- [x] Add deferred initial loading, initial error/retry, retry-disabled, zero-total, long category labels/many categories, missing category history, and cached-data refresh failure tests. Create a fresh query client per case. Ensure the initial pending state cannot display empty success. Test readable legend values rather than DOM implementation details.
- [x] Run `pnpm exec vitest run src/features/v2/test/StatisticsPage.test.tsx`, confirm the expected missing-page failure, then implement Overview/Breakdowns and page query lifecycle with `GlassPanel`. Import the new stylesheet only from the page.
- [x] Add EN/VI `statistics` navigation key plus a nested `statisticsPage` group for title, scope labels, states, range validation messages, chart/heatmap labels, and fallback task metadata. Keep existing locale keys intact. Use `getApiErrorMessage`, expose retry with `disabled={isFetching}` and retain cached data on refresh errors.
- [x] Use CSS conic-gradient donuts with a zero-total guard and text legends, all-time status label and recorded-history category label; use V2 tokens and tabular numbers. Rerun the integration and model tests; commit scoped files.

## Task 3: Trend panel and valid range interaction (AC04, AC05)

**Files:** Create `StatisticsTrend.tsx`; extend page, stylesheet, locales and page integration tests.

**Interface:** `StatisticsTrend({ dailyStats }: { dailyStats: DailyStat[] })`. Keep draft inputs and last valid `DateRange` local; this state is not passed to other panels.

- [x] Mock only `react-chartjs-2` in integration tests, capturing Line props to assert actual date keys and series values. Write preset tests for 7/14/30/90, a single-day input, missing-day zero, empty history and zero-activity range. Freeze Date with `vi.setSystemTime` without forcing fake timers for userEvent.
- [x] Add a behavior test for an invalid draft:

```tsx
await user.clear(screen.getByLabelText("From"));
expect(screen.getByRole("alert")).toHaveTextContent("Enter both dates");
// Assert the captured Line data still matches the preceding valid range.
await user.click(screen.getByRole("button", { name: "7 days", exact: true }));
expect(screen.queryByText("Enter both dates")).not.toBeInTheDocument();
expect(
  screen.getByRole("button", { name: "7 days", exact: true }),
).toHaveAttribute("aria-pressed", "true");
```

- [x] Add reversed, impossible, future-ended and >366-day model/view validation coverage. Assert that selecting a trend range does not change overview progress, category legend or heatmap window.
- [x] Run the page test and confirm missing controls/series assertions fail before implementation.
- [x] Register existing Chart.js scales/elements, build the two datasets with `buildTrend`, translate labels and format UTC date keys using existing helpers. Add a textual range-total summary, labelled canvas, valid input feedback and `aria-pressed` controls. Resolve chart canvas colors from V2 tokens on theme changes; disable chart animation when reduced motion is requested. Avoid passing unresolved CSS variables into canvas drawing options.
- [x] Rerun focused tests and commit the panel and related changes.

## Task 4: Heatmap and completed-task details (AC06, AC07)

**Files:** Create `StatisticsActivity.tsx`; extend page, stylesheet, locales and integration tests.

**Interface:** `StatisticsActivity({ dailyStats }: { dailyStats: DailyStat[] })`; consumes `createHeatmapModel(dailyStats, 365)` and `useActivityQuery(selectedDateKey)` unchanged.

- [x] Write tests for exactly 365 selectable buttons; disabled padding; count/date labels; aggregate counts; selected pressed state; click/Enter/Space toggle; close restoring focus. Freeze local today. Test local/UTC midnight windows, leap day and year transitions in model/helper integration rather than redefining helper semantics.
- [x] Write service-gating tests, including this assertion before selection:

```tsx
await screen.findByRole("heading", { name: "Statistics", level: 1 });
expect(statService.getCompletedTasksByDate).not.toHaveBeenCalled();
```

- [x] After selecting a labelled day, assert the service receives that exact date key plus request options. Cover loading, no completed tasks, failure then retry, translated missing title/category/project, and two deferred day requests resolved in reverse order. Assert old rows never appear under the newly selected heading.
- [x] Run focused integration tests and record expected missing-heatmap failures.
- [x] Implement the labelled scroll region, 365-day model, in-range button refs, selection state and local inline details. Use keyed query results without placeholder rows from the previous date; render only the current query's state. Keep details read-only. On explicit close, focus the recorded selected button; do not steal focus on query completion.
- [x] Rerun integration/model tests and commit scoped files.

## Task 5: Route, navigation and version switching (AC01, AC02)

**Files:** Modify V2 routes, Sidebar, Topbar and shared uiVersions; add `StatisticsNavigation.test.tsx`, extend existing `uiVersions.test.ts` and locale keys.

**Interfaces:** Preserve existing `getVersionDestination(location, target)` and `isSupportedProtectedPath(pathname)` signatures; add only exact Statistics handling.

- [x] Write these navigation assertions in the existing unit suite:

```ts
expect(getVersionDestination({ pathname: "/statistics" }, "v2")).toEqual({
  to: "/v2/statistics",
  isFallback: false,
});
expect(getVersionDestination({ pathname: "/v2/statistics" }, "v1")).toEqual({
  to: "/statistics",
  isFallback: false,
});
expect(isSupportedProtectedPath("/v2/statistics")).toBe(true);
expect(isSupportedProtectedPath("/v2/statistics/unknown")).toBe(false);
```

- [x] Test search/hash are discarded, trailing-slash normalization remains consistent, and existing unsupported-route fallbacks/dashboard taskId/notifications behavior still passes. Add Sidebar active-link and Topbar title tests with the existing shared providers and MemoryRouter.
- [x] Run `pnpm exec vitest run src/shared/navigation/test/uiVersions.test.ts src/features/v2/test/StatisticsNavigation.test.tsx`; confirm the expected missing mapping/link failures.
- [x] Register lazy `statistics` route with `RouteLoadError`, add `ChartNoAxesCombined` Sidebar item, resolve the topbar title, add `v2` field to the statistics `UI_ROUTES` entry, whitelist exact V2 route and implement symmetric exact destination branches. Keep protected wrapper unchanged.
- [x] Rerun navigation, existing shared navigation and V2 tests; commit scoped files.

## Task 6: Browser acceptance and final verification (AC01–AC11)

**Files:** Create `frontend/e2e/v2-statistics.spec.ts`; refine scoped CSS/copy only when needed; update spec/plan if requirements change.

- [x] Write Playwright tests before browser-driven fixes. Reuse `dashboardFixture` for auth and other shell APIs; override `/api/stats/` and `/api/stats/completed-tasks?*` with deterministic fixtures (128/96/18/10/4 and 365 dated daily records). Use `page.clock.install({ time: new Date('2026-11-18T12:00:00Z') })` before navigation. Include long category/task names and both activity response shapes in service-level tests if not already covered by existing service tests.
- [x] Cover authenticated direct load/sidebar/topbar, guest redirect, both version switches, range controls, keyboard day selection/close/retry, initial failure/empty, background refresh error, light/dark and EN/VI, and reduced-motion rendering. Assert the selected range is trend-only. Do not use arbitrary animation sleeps; wait for visible controls and stable chart state.
- [x] At widths 360, 390, 768 and 1440, test document overflow with the assistant closed and open; capture full-page light/dark screenshots at mobile and desktop. Inspect screenshots for text contrast, glass borders, wrapped labels, chart/legend legibility and unclipped controls. Verify heatmap internal scrolling does not expand the document.

```ts
expect(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
).toBe(true);
```

- [x] Run from frontend: `pnpm exec playwright test e2e/v2-statistics.spec.ts e2e/statistics.spec.ts --project=chromium`. The existing V1 suite may contain baseline failures; record them and compare with baseline rather than changing V1 behavior to satisfy unrelated tests.
- [x] Run `pnpm test`, then `pnpm run lint` from frontend; fix scoped failures and rerun affected checks.
- [x] Format only changed frontend files with `pnpm exec prettier --write <explicit-changed-frontend-paths>` (replace the argument with actual paths from the final diff), then run `pnpm run format:check`. If the full check reports unrelated pre-existing formatting failures, record exact files and run an additional explicit changed-file check; do not claim the full check passed.
- [x] Run `pnpm run build` from frontend (includes `pnpm run typecheck`), then `pnpm run build` and `pnpm test` from backend as the repository minimum. No backend modifications are expected.
- [x] Run `git diff --check` and inspect `git diff --stat`/`git status --short` for unrelated edits, generated artifacts or secrets. Review all AC IDs against test results. Record commands, pass/fail counts, screenshot paths and untested paths in the delivery notes. Commit only the reviewed feature files when implementation is authorized; merging remains a separate action.

## Coverage and current verification status

AC01–02 map to Task 5 and browser coverage; AC03/08/09 to Tasks 1–2; AC04–05 to Tasks 1/3; AC06–07 to Tasks 1/4; AC10–11 to Task 6. No implementation or verification task has been executed as part of this documentation-only request. Application tests, lint and builds are intentionally deferred to execution.
