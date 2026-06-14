# TodoApp UI/UX Audit and Redesign Plan

Date: 2026-06-14

Scope:
- Review only. No frontend feature changes were made.
- Backend is out of scope.
- Audit is based on current frontend code and the current Web Interface Guidelines ruleset.

Context framing:
- Subject: a daily planning workspace for individuals managing tasks, projects, and deadlines.
- Audience: solo users who need to scan, prioritize, and act quickly during the day.
- Single job: help the user decide what to do today without making the interface itself feel like work.

## Audit Summary

Overall assessment: `REQUEST_CHANGES`

The app already contains the right feature set, but the interface is visually inconsistent and over-signals almost every interaction. The strongest recurring problems are:

1. The product shell and many page wrappers use oversized radii, glassy backgrounds, and heavy shadows, which creates a “dashboard inside a dashboard” feel instead of a practical planning workspace.
2. Primary, secondary, and utility actions are all styled with similar visual weight, so the UI competes with itself instead of guiding the user.
3. Tasks, project summaries, category cards, and statistics tiles all use different visual languages, so the app feels assembled rather than designed as one product.
4. AI is visually over-presented through gradients, a floating bubble, and a hover video, which makes the product feel novelty-first even though AI is only one feature.
5. The app shell is desktop-first. The fixed sidebar and fixed chat panel will be awkward on smaller screens.

Useful observation:
- `frontend/src/feature/Statics/ActivityHeatmap.jsx`
- `frontend/src/feature/Calendar/CalendarTaskDetailCard.jsx`

These are closer to the target direction than older Todo, Category, and Profile surfaces. They already rely more on clean white surfaces, borders, and calmer spacing.

No new UI library is needed. Tailwind v4 plus a small token layer in `frontend/src/index.css` is enough.

## 1. Current UI Issues by Page

### Cross-cutting issues

- There is no real shared visual system. `frontend/src/index.css` and `frontend/src/App.css` define almost no reusable tokens, so styling decisions are repeated ad hoc in page and component class strings.
- Gradients are used as a default answer for titles, buttons, modal headers, cards, and assistant surfaces across the app. This is the biggest reason the UI reads as AI-generated instead of product-designed.
- Letter spacing is frequently exaggerated in eyebrow labels and metadata, for example `frontend/src/page/CategoryPage.jsx:192`, `frontend/src/feature/Calendar/CalendarView.jsx:121`, `frontend/src/feature/Todo/ProjectOverviewGrid.jsx:15`, `frontend/src/feature/Statics/ActivityHeatmap.jsx:224`.
- `transition-all` is used broadly across the UI, which makes motion feel generic instead of intentional. This pattern appears across pages, dialogs, task cards, charts, buttons, and nav.
- Many surfaces are still `select-none` or styled with default cursor behavior even when the content is informational. This reduces practicality in a productivity app where users may want to copy task names, emails, dates, or descriptions.

### App shell, navigation, and layout

- The main shell uses a permanent fixed sidebar plus a fixed topbar and a translucent blurred main area: `frontend/src/layout/MainLayout.jsx:19-27`, `frontend/src/component/Sidebar.jsx:74-79`, `frontend/src/component/Topbar.jsx:26-29`. This feels like a generic SaaS dashboard pattern rather than a focused planning tool.
- The sidebar is visually louder than it needs to be. It includes a branded title, marketing subtitle, collapsible width jump from `80px` to `304px`, and purple active states: `frontend/src/component/Sidebar.jsx:7-8`, `101-148`.
- The shell is not genuinely mobile-adaptive. It always reserves sidebar width in the layout rather than switching to an overlay drawer.
- The back control in the topbar is a clickable icon instead of a button: `frontend/src/component/Topbar.jsx:30-35`. That is both a UX and accessibility problem.

### Todo page

- The entire page is wrapped in one large frosted card with a huge radius and shadow: `frontend/src/page/TodoPage.jsx:358-443`. This makes the real content hierarchy flatter because everything sits inside one dominant container.
- The page title is still a gradient marketing headline instead of a practical workspace header: `frontend/src/page/TodoPage.jsx:362-365`.
- The action row presents three equally strong gradient buttons at once: `frontend/src/feature/Todo/GenTaskButton.jsx`. The result is CTA overload.
- `ProjectOverviewGrid` turns project filtering into a set of large promotional cards with nested progress bars and action buttons: `frontend/src/feature/Todo/ProjectOverviewGrid.jsx:36-100`. This is visually expensive for a page that should prioritize the task list.
- `TaskSelector` uses long, repetitive pills like “Pending Tasks” and “Given Up Tasks” with active treatments that are too loud for a filter control: `frontend/src/feature/Todo/TaskSelector.jsx`.
- `TaskItem` is visually noisy. Each task can show project, category, priority, pending state, due urgency, due timestamp, completion state, and multiple action buttons in one small surface: `frontend/src/feature/Todo/TaskItem.jsx:42-164`.
- Task urgency is duplicated. Users see both “2 days left” and “Due <date>” plus status chips.
- Hover-only “Try” actions add novelty but increase scanning cost on every task: `frontend/src/feature/Todo/TaskItem.jsx:95-103`.
- Modal shells use gradient headers and large shadowed containers again, so dialogs feel detached from the rest of the product: `frontend/src/page/TodoPage.jsx:447-483`, `frontend/src/feature/Dialog/DeleteDialog.jsx`, `frontend/src/feature/Dialog/GiveUpDialog.jsx`.

### Calendar page

- `CalendarPage` still uses the same gradient page title treatment as Todo and Statistics: `frontend/src/page/CalendarPage.jsx:68-71`.
- `CalendarView` has a good structure, but its header still uses gradient action buttons and oversized rounded cards: `frontend/src/feature/Calendar/CalendarView.jsx:117-155`.
- The calendar action bar again makes Add Task, Generate, and Add Project all feel primary: `frontend/src/feature/Calendar/CalendarView.jsx:128-152`.
- The right rail `ProjectFocusPanel` is one of the better-organized components, but it still leans too much on big radii, uppercase tracking, pills, and a decorative gradient banner: `frontend/src/feature/Calendar/ProjectFocusPanel.jsx:32-74`.
- `ProjectFocusWeekAgenda` introduces yet another accent family, amber plus rose, which competes with the sky palette and the green AI button palette: `frontend/src/feature/Calendar/ProjectFocusWeekAgenda.jsx:30-109`.
- `DayCell` packs multiple priority and time badges into small cells with several color conditions, making month view busier than necessary: `frontend/src/feature/Calendar/DayCell.jsx:82-150`.
- The calendar already has the best information architecture in the app, but it still suffers from too many accent systems and too much card chrome.

### Category and Projects page

- `CategoryPage` is effectively two mini-products in one: a category explorer and a project explorer. The switcher and header are heavily styled and the page still opens with a gradient hero band: `frontend/src/page/CategoryPage.jsx:188-247`.
- Category and project views do not feel like siblings. Category cards are older, louder, and more playful; project cards are newer, calmer, and more product-like. That drift is visible immediately.
- `CategoryCard` is one of the strongest sources of the “AI dashboard” feel: hover scale, floating delete button, gradient header, drop shadows, and a clickable `div` header: `frontend/src/feature/Category/CategoryCard.jsx:107-174`.
- `ProjectCard` is calmer than `CategoryCard`, but still too large and card-heavy for list management: `frontend/src/feature/Project/ProjectCard.jsx:76-167`.
- Stats tiles at the top use gradient numbers and shadow cards that look disconnected from the actual category/project content: `frontend/src/feature/Category/CategoryStats.jsx:7-31`.
- Empty states and creation modals follow the same rounded-shadow-gradient formula and keep reinforcing the template feeling.

### Statistics page

- The page wrapper returns to the frosted single-card shell from Todo/Profile: `frontend/src/page/StatisticsPage.jsx:94-127`.
- The header still uses a gradient marketing title: `frontend/src/page/StatisticsPage.jsx:98-104`.
- `StatsSummary` uses a row of shadow cards with gradient numerals in five different hues: `frontend/src/feature/Statics/StatsSummary.jsx:34-46`. This is eye-catching but not calm.
- `StatusPieChart` and `CategoryPieChart` use saturated multi-color donut slices and legends that feel more demo-like than product-like: `frontend/src/feature/Statics/StatusPieChart.jsx`, `frontend/src/feature/Statics/CategoryPieChart.jsx`.
- `LineChart` is functional, but its container still relies on `shadow-lg`, and the quick-range controls look disconnected from the app’s other controls: `frontend/src/feature/Statics/LineChart.jsx:192-257`.
- `ActivityHeatmap` is the best surface on the page. It already reflects a calmer product language and should become the benchmark for the rest of Statistics.

### Profile page

- The profile page currently reads more like a glossy user card than an account settings screen: `frontend/src/page/ProfilePage.jsx:132-145`.
- The whole page content is `select-none`: `frontend/src/page/ProfilePage.jsx:133`. That is counterproductive on a settings screen.
- `ProfileHeader` uses a gradient avatar fallback, gradient page title, and purple role pill: `frontend/src/feature/Profile/ProfileHeader.jsx:8-35`.
- `ProfileActions` uses two large gradient banner buttons that look promotional rather than utilitarian: `frontend/src/feature/Profile/ProfileActions.jsx:20-36`.
- `ProfileStats` repeats the same gradient-number summary tile pattern seen elsewhere: `frontend/src/feature/Profile/ProfileStats.jsx:25-37`.
- `ProfileInfo` is the calmest section on the page and is closer to the desired direction than the header and action area.

### AI assistant surfaces

- The floating chat bubble is visually loud and branded like a feature advertisement, not a utility control: `frontend/src/component/ChatBuble/Bubble.jsx:9-22`.
- The hover-triggered robot video is the single most gimmicky element in the app: `frontend/src/component/ChatBuble/Bubble.jsx:24-35`.
- The chat panel is fixed to `w-96 h-[32rem]` with a large gradient header: `frontend/src/component/ChatBuble/SmallChat.jsx:146-210`. This is not friendly to smaller screens and visually dominates every page.
- AI is valuable here, but it should feel like a quiet planning assistant, not the product mascot.

### Interface guideline gaps

- `frontend/src/component/Topbar.jsx:31-34` uses a clickable icon instead of a button.
- `frontend/src/feature/Category/CategoryCard.jsx:127-130` uses a clickable `div` for an interactive header.
- `frontend/src/feature/Profile/EditProfileModal.jsx:38-43` and `frontend/src/feature/Profile/ChangePasswordModal.jsx:53-58` have close buttons without `aria-label`.
- `frontend/src/feature/Profile/ChangePasswordModal.jsx:76-80`, `100-104`, `124-128` have password visibility toggles without `aria-label`.
- `frontend/src/feature/Profile/AvtUpload.jsx:37-43` has an icon-only button with `title` but no `aria-label`.
- `frontend/src/component/ChatBuble/SmallChat.jsx:147-149` is not responsive for narrow viewports.
- Placeholders and loading labels still use `...` in multiple places instead of the typographic ellipsis `…`, for example `frontend/src/feature/Todo/SearchBar.jsx:4`, `frontend/src/feature/Todo/Form/AddTaskForm.jsx:116`, `frontend/src/feature/Todo/Form/TaskDetailForm.jsx:164`.

## 2. Design Principles to Apply

### Product stance

- Design this as a planning tool first, not a dashboard first.
- The interface should help users scan today’s work fast, act with confidence, and recover context later.
- AI should be present as an assistant, not as the visual identity of the product.

### Visual principles

- One accent, not many. Use a single muted primary accent across the shell and primary actions. Reserve semantic colors for task state and error messaging only.
- Prefer borders over shadows. Most surfaces should separate with tone and 1px borders, not with large elevation.
- Remove glassmorphism. Use a stable canvas color with white section surfaces.
- Reduce decorative rounding. Large radii should be reserved for modal shells and maybe one signature surface, not every card.
- Make hierarchy spatial, not chromatic. Use spacing, grouping, and alignment to show importance instead of gradients everywhere.
- Keep action hierarchy strict. One primary action per zone. Secondary actions become bordered or ghost controls.
- Simplify task metadata. A task should communicate title, due status, project/category context, and status in one or two lines, not six pills.

### Typographic principles

- Use calmer, denser typography with more consistent weight steps.
- Remove most forced uppercase eyebrow labels. When used, keep tracking subtle.
- Use tabular numerals for counts, dates, and stats.
- Replace hero-style page titles with product-style headings and short context lines.

### Signature element

Recommended signature: a “planner rail” motif.

- Replace gradient hero headers with a quiet date/status rail at the top of major pages.
- Examples: “Today”, selected project, visible task count, current week, or completion pace shown as compact utility chips and dividers.
- This is a real aesthetic risk, but it is justified because it comes from the subject matter of daily planning rather than from generic SaaS decoration.

## 3. Reusable Visual System

### Colors

Core neutrals:

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F6F7F9` | App background |
| `surface` | `#FFFFFF` | Cards, panels, modals |
| `surface-muted` | `#F1F3F5` | Secondary wells, selected rows |
| `line` | `#D9DEE5` | Borders, dividers |
| `text` | `#1F2328` | Primary text |
| `text-muted` | `#667085` | Secondary text |

Primary accent:

| Token | Hex | Use |
|---|---|---|
| `accent` | `#456B8C` | Primary buttons, active nav, links |
| `accent-soft` | `#EAF1F6` | Selected states, subtle chips |

Semantic accents:

| Token | Hex | Use |
|---|---|---|
| `success` | `#2F7D5A` | Completed |
| `warning` | `#A46A2A` | Due soon |
| `danger` | `#B25547` | Overdue, destructive |
| `neutral-state` | `#7A7F87` | Given up, inactive |

Rules:
- Do not use gradients for normal product surfaces.
- Do not assign a unique saturated color family to each page.
- Keep project/category chips neutral by default; color only status and urgency.

### Spacing

Base scale:

- `4px`: icon padding, micro gaps
- `8px`: chip spacing, tight control groups
- `12px`: form row gaps, compact card sections
- `16px`: default card padding, control height rhythm
- `20px`: page section padding on mobile
- `24px`: desktop section padding
- `32px`: major section separation

Rules:
- Use denser vertical rhythm in task-heavy views.
- Reserve large whitespace for page transitions and empty states, not between every small component.

### Border radius

- `8px`: inputs, compact buttons, small cards
- `10px`: default buttons
- `12px`: standard cards and panels
- `16px`: larger surfaces and drawers
- `20px`: modal shells only
- `9999px`: chips and badges only

Rules:
- Remove `rounded-[28px]`, `rounded-3xl`, and other oversized radii from standard content cards.

### Shadows

- Default surface: `0 1px 2px rgba(16, 24, 40, 0.06)`
- Hover surface: `0 6px 16px rgba(16, 24, 40, 0.08)`
- Modal: `0 20px 50px rgba(16, 24, 40, 0.16)`

Rules:
- No `shadow-lg` or `shadow-2xl` on standard page surfaces.
- Use shadows for elevation changes, not as a default styling layer.

### Typography

Recommended type system:

- UI/body: `IBM Plex Sans`, fallback to system sans
- Display/section: `IBM Plex Sans Condensed` used sparingly for dates or major section labels
- Utility: `IBM Plex Mono` or system monospace for counts, date rails, and filters

If no font addition is approved:
- Keep system UI fonts, but still apply the size, weight, and spacing rules below.

Suggested scale:

- Page title: `28/32`, semibold
- Section title: `20/28`, semibold
- Card title: `16/24`, medium
- Body: `14/22`
- Meta: `12/18`
- Utility counts: `12/16` with tabular numerals

Rules:
- Remove gradient text headings.
- Keep eyebrow tracking under `0.08em`. Current `0.22em` to `0.30em` is too theatrical for this product.
- Use sentence case for most labels and buttons.

### Button styles

Primary:
- Solid `accent` background
- White text
- `h-10` or `h-11`
- `rounded-[10px]`
- Minimal hover darkening, no gradient

Secondary:
- White or `surface`
- 1px `line` border
- Text in `text`
- Subtle `surface-muted` hover

Tertiary:
- Transparent background
- Text in `text-muted`
- Hover background `surface-muted`

Destructive:
- White background
- `danger` text
- `danger` border tint
- Solid destructive fill only inside confirmation steps

Rules:
- One primary button per control group.
- Generate/Create actions should not all be primary together.

### Card styles

Page container:
- Remove the “single giant rounded card” page wrapper pattern.
- Use `canvas` background with separate section surfaces.

Section card:
- White surface
- `12px` radius
- 1px border
- Light shadow or no shadow

Modal card:
- White surface
- `16px` to `20px` radius
- Stronger shadow
- Neutral header, not gradient header

### Badge styles

Default badge:
- Neutral background and subtle border
- Small text, medium weight
- Use for category, project, counts

Status badge:
- Semantic tint only
- Never full-saturation unless destructive

Rules:
- Badges should support scanning, not compete with headings.
- Avoid stacking more than two strong badges in one row on normal task cards.

### Task card styles

Recommended structure:

1. Left: checkbox or state control
2. Center primary row: title and optional due date
3. Center secondary row: project/category context
4. Right: one compact status treatment and overflow actions

Rules:
- No tinted full-card backgrounds by default
- Use a thin state accent, small dot, or subtle badge instead
- Merge duplicate due information into one clear date/urgency line
- Keep quick actions hidden until hover or selection, but do not rely on hover for comprehension

## 4. Components Likely to Refactor

| Area | Files | Why |
|---|---|---|
| Shell primitives | `frontend/src/layout/MainLayout.jsx`, `frontend/src/component/Sidebar.jsx`, `frontend/src/component/Topbar.jsx` | Current layout creates the dashboard feel and blocks true mobile responsiveness |
| Token layer | `frontend/src/index.css`, `frontend/src/App.css` | No shared design tokens or reusable surface patterns |
| Buttons and inputs | `frontend/src/feature/Todo/Form/*`, `frontend/src/feature/Profile/*Modal.jsx`, `frontend/src/feature/Dialog/*`, `frontend/src/feature/Todo/SearchBar.jsx` | Same intent is styled differently in many places |
| Task cards | `frontend/src/feature/Todo/TaskItem.jsx`, `frontend/src/feature/Category/TaskCard.jsx`, `frontend/src/feature/Calendar/CalendarTaskDetailCard.jsx` | Three separate task card languages need one system |
| Project/category summaries | `frontend/src/feature/Todo/ProjectOverviewGrid.jsx`, `frontend/src/feature/Project/ProjectCard.jsx`, `frontend/src/feature/Category/CategoryCard.jsx` | Large card-heavy presentation adds noise and inconsistency |
| Status/count summaries | `frontend/src/feature/Statics/StatsSummary.jsx`, `frontend/src/feature/Profile/ProfileStats.jsx`, `frontend/src/feature/Category/CategoryStats.jsx` | Repeated gradient stat-tile pattern should become one calmer component family |
| Modal shell | `frontend/src/feature/Dialog/*`, `frontend/src/feature/Project/ProjectDetailModal.jsx`, `frontend/src/feature/Calendar/TaskListDetailModal.jsx` | Current modals reuse gradient headers and heavy shadows |
| AI entry surfaces | `frontend/src/component/ChatBuble/Bubble.jsx`, `frontend/src/component/ChatBuble/SmallChat.jsx` | Keep feature, reduce gimmick, improve responsiveness |
| Progress and badges | `frontend/src/feature/Todo/ProgressBar.jsx`, task and project badge code across features | Shared status language is currently fragmented |

## 5. Page-by-Page Implementation Phases

### Phase 1: Shared layout and design tokens

- Add CSS custom properties for color, radius, shadow, spacing, and semantic states in `frontend/src/index.css`.
- Create a small set of reusable Tailwind-backed patterns for `app-shell`, `page-header`, `section-card`, `button-primary`, `button-secondary`, `badge`, `input`, and `modal-shell`.
- Replace glassy page wrappers with a neutral canvas plus section surfaces.
- Standardize focus rings, hover behavior, and motion rules.
- Keep Tailwind. Do not introduce a new UI library.

Exit criteria:
- New pages can be assembled from shared primitives instead of bespoke class strings.

### Phase 2: Topbar and Sidebar

- Convert the permanent sidebar layout into a responsive shell:
  - desktop: compact left rail
  - tablet/mobile: overlay drawer
- Remove the sidebar marketing title and subtitle. The app shell should navigate, not advertise.
- Convert active nav styling from purple fills to a calmer accent plus subtle background.
- Replace the topbar back icon with a proper button and simplify the avatar button.
- Introduce a compact “planner rail” header area shared across pages.

Exit criteria:
- The shell feels quieter and works at phone, tablet, and desktop widths.

### Phase 3: Todo

- Remove the giant page wrapper card and split the page into:
  - compact page header
  - action row
  - optional project focus rail
  - task list
  - progress summary
- Rework `GenTaskButton` so only `Add Task` is primary. Move category/project creation to secondary actions. Make AI generation tertiary or contextual.
- Replace `ProjectOverviewGrid` with a more compact project focus pattern:
  - horizontal rail
  - compact list
  - or a single filter panel with optional detail expansion
- Redesign `TaskItem` around a two-row, scan-first layout with fewer badges and one due signal.
- Shorten filter labels and make task status controls look like filters, not action pills.

Exit criteria:
- The Todo page reads as a daily workbench, not as a summary dashboard.

### Phase 4: Calendar

- Keep the current information architecture. It is strong.
- Restyle `CalendarView`, `ProjectFocusPanel`, `ProjectFocusWeekAgenda`, and `DayCell` to share one calm accent system.
- Reduce month cell badge count and simplify task previews inside day cells.
- Move from three gradient action buttons to one primary action plus secondary/tertiary controls.
- Make the right-side project filter panel visually lighter and more list-like.

Exit criteria:
- Calendar remains powerful but feels less ornamental and easier to scan.

### Phase 5: Category and Projects

- Unify Category and Project views under one structural pattern so the switch between them feels intentional.
- Replace the older `CategoryCard` hover-scale gradient style with the calmer project card language.
- Reduce card height and compress task previews so more groups fit above the fold.
- Standardize empty states and create/edit modals with the shared modal shell.
- Keep drag-and-drop behavior, but make drop affordances subtler and more product-like.

Exit criteria:
- Categories and Projects feel like two views of the same workspace, not two different products.

### Phase 6: Statistics

- Use `ActivityHeatmap` as the visual reference surface for the rest of the page.
- Replace gradient stat tiles with compact bordered summaries using tabular numerals.
- Tone down chart containers and legends so the data, not the chrome, carries the page.
- Reduce the chart color palette to semantic essentials and a small neutral range.
- Bring range controls into the same button/input system as the rest of the app.

Exit criteria:
- Statistics feels analytical and calm rather than flashy.

### Phase 7: Profile

- Reframe Profile as Account Settings, not a user showcase page.
- Replace the gradient avatar/name presentation with a quieter account summary block.
- Convert action banners into standard settings actions.
- Keep stats, but make them compact secondary information instead of hero content.
- Remove blanket `select-none` usage from the page.

Exit criteria:
- Profile feels trustworthy and practical, with clean settings UX.

## 6. Risks

- Shared-token migration will touch many class strings. Without discipline, the app can end up half-old and half-new for a while.
- If the floating AI bubble is visually demoted too early, users may think AI features were removed. Discoverability needs a replacement entry point.
- Reworking the app shell is the highest-value change, but it also carries the biggest responsive regression risk.
- Task cards are information-dense. Oversimplifying them could remove useful context. The redesign must reduce noise without reducing utility.
- Calendar density is easy to break. Month view especially needs careful testing after any task preview changes.
- If new fonts are introduced, performance and fallback behavior must be checked. If font loading is not acceptable, the system stack plan must still feel deliberate.
- Existing modal patterns are repeated in many places. Migrating them incrementally is safer than rewriting every modal at once.

## 7. Validation Steps

### Visual validation

- Compare before/after screenshots at `360px`, `768px`, `1024px`, and `1440px`.
- Check that each page has one clear primary action and that secondary actions no longer visually compete with it.
- Verify that headings no longer rely on gradients, oversized tracking, or decorative wrappers for hierarchy.
- Confirm that task lists show more useful information above the fold than before.

### Interaction validation

- Keyboard through shell navigation, filters, dialogs, and task actions.
- Verify visible focus states on all buttons, links, pills, and input controls.
- Check that icon-only controls have `aria-label`.
- Make sure the sidebar, chat assistant, and modals behave correctly on small screens.

### Content validation

- Stress test with long project names, long task names, empty descriptions, many tags, and zero-state pages.
- Verify count formatting, date formatting, and truncation behavior in cards and charts.
- Ensure semantic colors are only used for status, urgency, and destructive actions.

### Product validation

- Run through core flows:
  - add task
  - filter tasks
  - assign project/category
  - generate tasks with AI
  - edit task
  - view calendar day
  - inspect statistics
  - update profile
- Check that AI remains discoverable but visually secondary.

## Recommendation

Start with Phase 1 and Phase 2 before touching page internals. The current “AI-generated” feeling is mostly a shell and system problem, not just a page-by-page problem. If the shared layout, tokens, buttons, cards, and action hierarchy are fixed first, the rest of the redesign becomes faster and much more coherent.

