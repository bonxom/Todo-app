import type { Task } from '@/shared/types/domain';

export type TaskSortOption = 'dueDate' | 'priority' | 'title';

export interface TaskFilterParams {
  tasks: Task[];
  searchTerm?: string;
  selectedStatuses?: string[];
  selectedProjectId?: string;
  sortBy?: TaskSortOption;
}

const PRIORITY_ORDER: Record<string, number> = {
  High: 1,
  high: 1,
  Medium: 2,
  medium: 2,
  Low: 3,
  low: 3,
};

export function filterAndSortTasks({
  tasks,
  searchTerm = '',
  selectedStatuses = [],
  selectedProjectId = 'all-projects',
  sortBy = 'dueDate',
}: TaskFilterParams): Task[] {
  if (!Array.isArray(tasks)) return [];

  const query = searchTerm.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    // 1. Search filter
    if (query) {
      const titleMatch = (task.title || '').toLowerCase().includes(query);
      const descMatch = (task.description || '').toLowerCase().includes(query);
      if (!titleMatch && !descMatch) return false;
    }

    // 2. Status filter
    if (selectedStatuses.length > 0) {
      if (!selectedStatuses.includes(task.status)) return false;
    }

    // 3. Project filter
    const taskProjectId = (typeof task.projectId === 'object' && task.projectId !== null) ? task.projectId._id : task.projectId || null;
    if (selectedProjectId === 'standalone-projects') {
      if (taskProjectId !== null) return false;
    } else if (selectedProjectId !== 'all-projects') {
      if (taskProjectId !== selectedProjectId) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (sortBy === 'priority') {
      const rankA = PRIORITY_ORDER[a.priority || 'Medium'] ?? 2;
      const rankB = PRIORITY_ORDER[b.priority || 'Medium'] ?? 2;
      if (rankA !== rankB) return rankA - rankB;
    } else if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }

    // Default: sortBy === 'dueDate'
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export function calculateProjectMetrics(
  tasks: Task[],
  projectId: string | null
): { total: number; completed: number; progress: number } {
  if (!Array.isArray(tasks)) return { total: 0, completed: 0, progress: 0 };

  const projectTasks = tasks.filter((task) => {
    const taskProjectId = (typeof task.projectId === 'object' && task.projectId !== null) ? task.projectId._id : task.projectId || null;
    if (projectId === null || projectId === 'standalone-projects') {
      return !taskProjectId;
    }
    return taskProjectId === projectId;
  });

  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.status === 'completed').length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, progress };
}
