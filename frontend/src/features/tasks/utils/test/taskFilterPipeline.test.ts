import { describe, expect, it } from 'vitest';
import { filterAndSortTasks, calculateProjectMetrics } from '../taskFilterPipeline';
import type { Task } from '@/shared/types/domain';

const mockTasks: Task[] = [
  { _id: '1', title: 'Task Alpha', status: 'pending', priority: 'High', dueDate: '2026-08-20', categoryId: null, projectId: 'p1', startDate: '' },
  { _id: '2', title: 'Task Beta', status: 'in-progress', priority: 'Low', dueDate: '2026-08-18', categoryId: null, projectId: 'p1', startDate: '' },
  { _id: '3', title: 'Task Gamma', status: 'completed', priority: 'Medium', dueDate: '2026-08-25', categoryId: null, projectId: null, startDate: '' },
  { _id: '4', title: 'Task Delta', status: 'given-up', priority: 'High', dueDate: '', categoryId: null, projectId: 'p2', startDate: '' },
];

describe('taskFilterPipeline', () => {
  it('filters tasks by search term (case-insensitive)', () => {
    const result = filterAndSortTasks({ tasks: mockTasks, searchTerm: 'alpha' });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('1');
  });

  it('filters tasks by selected statuses array', () => {
    const result = filterAndSortTasks({ tasks: mockTasks, selectedStatuses: ['pending', 'in-progress'] });
    expect(result).toHaveLength(2);
    expect(result.map(t => t._id)).toEqual(['1', '2']);
  });

  it('filters tasks by project ID or standalone', () => {
    const p1Tasks = filterAndSortTasks({ tasks: mockTasks, selectedProjectId: 'p1' });
    expect(p1Tasks).toHaveLength(2);

    const standaloneTasks = filterAndSortTasks({ tasks: mockTasks, selectedProjectId: 'standalone-projects' });
    expect(standaloneTasks).toHaveLength(1);
    expect(standaloneTasks[0]._id).toBe('3');
  });

  it('sorts by dueDate (earliest first, tasks without dueDate at the end)', () => {
    const result = filterAndSortTasks({ tasks: mockTasks, sortBy: 'dueDate' });
    expect(result.map(t => t._id)).toEqual(['2', '1', '3', '4']);
  });

  it('sorts by priority (High -> Medium -> Low)', () => {
    const result = filterAndSortTasks({ tasks: mockTasks, sortBy: 'priority' });
    expect(result[0].priority).toBe('High');
    expect(result[result.length - 1].priority).toBe('Low');
  });

  it('calculates stable project metrics correctly regardless of any filter', () => {
    const metrics = calculateProjectMetrics(mockTasks, 'p1');
    expect(metrics).toEqual({ total: 2, completed: 0, progress: 0 });

    const standaloneMetrics = calculateProjectMetrics(mockTasks, null);
    expect(standaloneMetrics).toEqual({ total: 1, completed: 1, progress: 100 });
  });
});
