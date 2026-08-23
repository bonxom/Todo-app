import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CalendarView from '../CalendarView';

vi.mock('../CalendarGrid', () => ({
  default: () => <div>Calendar grid</div>,
}));

vi.mock('../ProjectFocusPanel', () => ({
  default: () => <section>Project filters panel</section>,
}));

vi.mock('../ProjectFocusWeekAgenda', () => ({
  default: ({ compact }) => (
    <section data-compact={compact}>
      <span>All Tasks Day</span>
    </section>
  ),
}));

vi.mock('../DetailRequestModal', () => ({ default: () => null }));
vi.mock('@/features/tasks/components/dialogs/AddTaskModal', () => ({ default: () => null }));
vi.mock('@/features/tasks/components/Form/AddProjectForm', () => ({ default: () => null }));

describe('CalendarView project filters', () => {
  it('moves the day agenda into the project column while filters are hidden and restores them from the project icon', async () => {
    const user = userEvent.setup();

    render(
      <CalendarView
        tasks={[]}
        projects={[]}
        currentDate={new Date(2026, 7, 23)}
        viewMode="week"
        isRangeLoading={false}
        onCurrentDateChange={() => {}}
        onViewModeChange={() => {}}
        onTaskUpdated={() => {}}
        onTaskStatusChange={() => {}}
        onTaskDelete={() => {}}
        onTaskDueDateChange={() => {}}
        onTaskCopy={() => {}}
        onProjectStatusChange={() => {}}
      />
    );

    const agenda = screen.getByText('All Tasks Day').closest('section');
    const projectFiltersReveal = screen.getByText('Project filters panel')
      .closest('[data-project-filters-reveal]');
    const projectFiltersRail = projectFiltersReveal?.parentElement;
    expect(agenda?.parentElement).toHaveClass('xl:col-start-1', 'xl:row-start-2');
    expect(agenda).toHaveAttribute('data-compact', 'false');
    expect(screen.getByText('Project filters panel')).toBeVisible();
    expect(projectFiltersReveal).toHaveAttribute('data-open', 'true');

    await user.click(screen.getByRole('button', { name: 'Hide project filters' }));

    expect(projectFiltersReveal).toHaveAttribute('data-open', 'false');
    expect(projectFiltersReveal).toHaveAttribute('aria-hidden', 'true');
    expect(projectFiltersRail).toHaveAttribute('data-open', 'false');
    expect(agenda?.parentElement).toHaveClass('xl:col-start-2', 'xl:row-start-1');
    expect(agenda).toHaveAttribute('data-compact', 'true');

    await user.click(screen.getByRole('button', { name: 'Show project filters' }));

    expect(screen.getByText('Project filters panel')).toBeVisible();
    expect(projectFiltersReveal).toHaveAttribute('data-open', 'true');
    expect(projectFiltersRail).toHaveAttribute('data-open', 'true');
    expect(agenda?.parentElement).toHaveClass('xl:col-start-1', 'xl:row-start-2');
    expect(agenda).toHaveAttribute('data-compact', 'false');
  });
});
