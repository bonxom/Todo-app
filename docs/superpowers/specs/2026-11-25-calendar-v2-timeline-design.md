# Calendar V2 Timeline

## Goal

Add **Timeline** (**Dòng thời gian** in Vietnamese) beside **Week** and **Month** on `/v2/calendar`. Users can scan tasks due from today onward and keep scrolling across weeks and months. The reference image informs the prominent date markers and grouped task rows. The presentation follows Orbit's Liquid Glass design.

## Selected approach

The user selected a continuous list starting today. A month-based list would reuse Calendar's period navigation and require users to change periods at month boundaries. Timeline loads consecutive date windows into a single list.

## Navigation and layout

- Selecting **Timeline** starts at today's date in the browser's time zone, even after browsing a different period in **Week** or **Month**. **Today** scrolls to the top of Timeline. If the local date has changed, it loads the new date range. Timeline's toolbar offers **Today**, the view selector, and **New task**. The previous and next period buttons appear in **Week** and **Month**.
- Switching back to **Week** or **Month** returns to the previously browsed period. The default calendar view in Settings remains a choice between Week and Month. Timeline is selected from Calendar V2.
- Each date with tasks forms a group. Its date marker shows **Today**, **Tomorrow**, or the weekday, followed by a prominent day number, month and year, and a localized task count. The marker sits to the left on wide layouts and above the rows when content space is limited. Headings expose the full date to assistive technology.
- A task row shows its title, description when present, due time, status, and priority. Activate the row by mouse, touch, or keyboard to open the existing `TaskDetailsDialog`. The dialog provides task editing and status actions. Timeline refreshes after supported task mutations.
- Use V2 locale strings and theme tokens. Wrap long titles, provide text labels for status, show visible focus, and give primary controls at least 44 × 44 CSS px of target space. Adapt to the content width so the layout works with the assistant dock open.

```text
[Today]   [Week] [Month] [Timeline]   [New task]

Today 25       09:00  Submit weekly report · In progress
November 2026  17:30  Prepare the team summary · Pending

Tomorrow 26    08:30  Check the meeting schedule · Pending

                      [Load more days]
```

## Data and continuation

- Fetch tasks with a valid `dueDate` in windows of **14 local calendar days**. The first window covers today and the next 13 dates. Each following window starts at local midnight on the date after the last window. The existing API accepts inclusive ISO bounds, so each window ends at 23:59:59.999 local time on its final date. Use calendar-day arithmetic across daylight-saving changes, month ends, and year ends.
- Group by the local date of `dueDate` and sort by due instant ascending, using task ID as the display tie-breaker. Display each ID once. Omit tasks with missing or invalid due dates and tasks outside the window they were returned for. Include every task status and skip empty date groups.
- Reuse `GET /api/tasks` with `startDate`, `endDate`, `pageNo`, `pageSize=100`, and `sort=dueDate:asc_createdAt:asc`. Read all pages indicated by `pageInfo.totalPage` so a date window can contain more than 100 tasks. Reuse the existing authenticated client, request cancellation, and invalidation. Give Timeline its own query shape under `taskKeys.all`.
- Scrolling to the end of the loaded list appends the next date window. Each entry of the end marker into view can start one automatic load. If the end marker is already visible after the initial render or after an empty window, **Load more days** lets the user continue. The button also supports keyboard use and browsers without `IntersectionObserver`. An empty window advances the date boundary and keeps the button available. Any aggregate count describes the loaded tasks.
- Show an initial loading state and an error with **Retry**. When the loaded days contain no tasks, show the last date checked and allow continuation. If continuation or a background refresh fails, keep the visible rows and offer a retry for the failed operation. Append a date window once all its API pages have succeeded.

## Scope

This feature applies to Calendar V2 only. It shows existing Orbit tasks with due dates. Recurring reminders, starring, inline task mutations, drag and drop in Timeline, and dates before today are out of scope. V1, the API, the schema, access checks, and Settings retain their current contracts.

## Acceptance criteria

1. Selecting **Timeline** in V2 starts today after browsing another period. **Today** returns to the top. Switching to **Week** or **Month** preserves the browsed period. Calendar V1 offers its existing views.
2. Fixtures cover a month boundary, local midnight, and a daylight-saving change. Date groups, due-time ordering, relative labels, invalid dates, and duplicate IDs follow the rules above. A window with more than 100 result rows loads all API pages.
3. Scrolling appends a window and retains existing rows. The load button continues through empty windows. Rapid triggers share one in-flight request, and retry resumes the failed window without duplicate rows.
4. Enter opens the matching task. Closing the dialog returns focus to the row if it remains visible. Creating a task, editing its due date to another loaded day, or changing its status refreshes the list.
5. Playwright verifies the UI using fixtures at 360, 768, and 1440 px, across both themes and languages, plus a narrow content area with the assistant dock open. Verify horizontal overflow, focus, date labels, and both scroll and button continuation.
