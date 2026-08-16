import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CalendarGrid from '../CalendarGrid';

describe('CalendarGrid', () => {
  it('shows an in-place loading indicator while a new calendar range is loading', () => {
    render(
      <CalendarGrid
        currentDate={new Date(2026, 7, 16)}
        selectedDate={new Date(2026, 7, 16)}
        onDateSelect={() => {}}
        onNavigate={() => {}}
        onResetToToday={() => {}}
        tasksByDate={{}}
        onTaskUpdated={() => {}}
        onTaskDueDateChange={() => {}}
        onTaskCopy={() => {}}
        viewMode="week"
        isRangeLoading
      />
    );

    expect(screen.getByRole('status', { name: 'Loading calendar range' })).toBeVisible();
  });
});
