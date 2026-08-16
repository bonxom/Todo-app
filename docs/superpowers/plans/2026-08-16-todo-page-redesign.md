# Todo Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Todo Page into an asynchronous, robust 2-column workspace (65–70% Task Workspace vs 30–35% sticky Project Focus Rail) with decoupled true project metrics and a Calendar-aligned 4-status interactive card model (Pending, In Progress, Completed, Given Up).

**Architecture:** Split the monolithic `TodoPage.jsx` into modular units: `TodoTaskToolbar` for local filtering/sorting, `TodoTaskCard` for rich 4-state task interactions, and `ProjectFocusRail` for stable project statistics and selection. Decouple raw tasks data flow so project metrics never fluctuate when task list filters change.

**Tech Stack:** React 19, Tailwind CSS 4, TanStack React Query 5, Zustand, Lucide Icons, Vitest / Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-16-todo-page-redesign.md`

## Global Constraints
- Desktop layout split: Task Workspace (`min-w-[36rem]`, ~65–70%) and Project Rail (`w-full max-w-[24rem] min-w-[20rem]`, ~30–35%).
- Project rail sticky behavior: `position: sticky; top: calc(var(--topbar-height, 4rem) + 1rem);` with internal scrolling (`max-h-[calc(100dvh-6.5rem)]`).
- Project statistics (counters, progress %, completion rates) must strictly compute from `allTasks` (`rawTasks`), completely independent of search/status filters.
- Task status interactions match Calendar: Pending has Accept/Deny (Deny deletes task), In Progress has Complete/Give Up, Completed/Given Up has Restore.
- Mobile/Tablet (`< lg`): Single column stack with Task List appearing first.
- No editing of lockfiles or node_modules directly.

---

### Task 1: Task Sort and Filter Pipeline Utilities & Unit Tests

**Files:**
- Create: `frontend/src/features/tasks/utils/taskFilterPipeline.ts`
- Test: `frontend/src/features/tasks/utils/test/taskFilterPipeline.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type TaskSortOption = 'dueDate' | 'priority' | 'title';

  export interface TaskFilterParams {
    tasks: Task[];
    searchTerm?: string;
    selectedStatuses?: string[];
    selectedProjectId?: string; // 'all-projects' | 'standalone-projects' | projectId
    sortBy?: TaskSortOption;
  }

  export function filterAndSortTasks(params: TaskFilterParams): Task[];
  export function calculateProjectMetrics(tasks: Task[], projectId: string | null): { total: number; completed: number; progress: number };
  ```

- [ ] **Step 1: Write failing unit tests for filtering, sorting, and project metrics calculation**

```typescript
// frontend/src/features/tasks/utils/test/taskFilterPipeline.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm test src/features/tasks/utils/test/taskFilterPipeline.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `taskFilterPipeline.ts`**

```typescript
// frontend/src/features/tasks/utils/taskFilterPipeline.ts
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
    const taskProjectId = task.projectId?._id || task.projectId || null;
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

export function calculateProjectMetrics(tasks: Task[], projectId: string | null): { total: number; completed: number; progress: number } {
  if (!Array.isArray(tasks)) return { total: 0, completed: 0, progress: 0 };

  const projectTasks = tasks.filter((task) => {
    const taskProjectId = task.projectId?._id || task.projectId || null;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm test src/features/tasks/utils/test/taskFilterPipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/tasks/utils/taskFilterPipeline.ts frontend/src/features/tasks/utils/test/taskFilterPipeline.test.ts
git commit -m "feat(tasks): add pure pipeline for task filtering, sorting, and project metrics"
```

---

### Task 2: Implement Calendar-Aligned `TodoTaskCard` Component

**Files:**
- Create: `frontend/src/features/tasks/components/TodoTaskCard.jsx`
- Modify: `frontend/src/features/tasks/components/TaskList.jsx`
- Modify: `frontend/src/styles/app.css`

**Interfaces:**
- Consumes:
  - `task: Task`
  - `onAccept: (taskId: string) => Promise<void>`
  - `onDeny: (taskId: string) => Promise<void>`
  - `onComplete: (taskId: string) => Promise<void>`
  - `onGiveUp: (taskId: string) => Promise<void>`
  - `onRestore: (taskId: string) => Promise<void>`
  - `onEdit: (task: Task) => void`
  - `onDelete: (taskId: string) => void`

- [ ] **Step 1: Write `TodoTaskCard.jsx` with full 4-status interactivity and feedback**

```jsx
// frontend/src/features/tasks/components/TodoTaskCard.jsx
import { useState } from 'react';
import {
  Check,
  CircleDot,
  Clock,
  Flag,
  Loader2,
  Pencil,
  RotateCcw,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { formatDateTime } from '@/shared/utils/dateTime';
import { getProjectColor } from '@/shared/utils/projectColor';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
    borderStyle: 'dashed',
  },
  'in-progress': {
    label: 'In Progress',
    badgeClass: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-transparent',
    borderStyle: 'solid',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
    borderStyle: 'solid',
  },
  'given-up': {
    label: 'Given Up',
    badgeClass: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
    borderStyle: 'solid',
  },
};

const PRIORITY_CONFIG = {
  High: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  high: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  Medium: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
  medium: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
  Low: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
  low: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
};

const getDaysLeft = (deadline) => {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const TodoTaskCard = ({
  task,
  onAccept,
  onDeny,
  onComplete,
  onGiveUp,
  onRestore,
  onEdit,
  onDelete,
}) => {
  const [isActionPending, setIsActionPending] = useState(false);
  const taskId = task._id || task.id;
  const isPending = task.status === 'pending';
  const isCompleted = task.status === 'completed';
  const isGivenUp = task.status === 'given-up';
  const isInProgress = task.status === 'in-progress';
  const isMuted = isCompleted || isGivenUp;

  const projectColor = task.projectId ? getProjectColor(task.projectId) : null;
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityClass = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
  const daysLeft = getDaysLeft(task.dueDate);

  const handleAction = async (fn) => {
    if (isActionPending || !fn) return;
    try {
      setIsActionPending(true);
      await fn(taskId);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <article
      className={`ui-section-card relative p-4 transition-all duration-200 hover:shadow-sm ${
        isMuted ? 'opacity-80 bg-[var(--color-surface-muted)]' : 'bg-[var(--color-surface)]'
      }`}
      style={{
        borderLeftColor: projectColor || 'var(--color-line)',
        borderLeftWidth: '5px',
        borderStyle: isPending ? 'dashed' : 'solid',
        borderColor: isPending ? 'var(--color-line)' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Left Action Button (Status Specific) */}
        <div className="mt-0.5 shrink-0">
          {isPending && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAction(onAccept)}
                disabled={isActionPending}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-success)] bg-[var(--color-success-soft)] px-2.5 text-xs font-semibold text-[var(--color-success)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                aria-label={`Accept ${task.title}`}
                title="Accept task to in-progress"
              >
                {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                <span>Accept</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(onDeny)}
                disabled={isActionPending}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-2.5 text-xs font-semibold text-[var(--color-danger)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                aria-label={`Deny and delete ${task.title}`}
                title="Deny and delete task"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>Deny</span>
              </button>
            </div>
          )}

          {isInProgress && (
            <button
              type="button"
              onClick={() => handleAction(onComplete)}
              disabled={isActionPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-transparent hover:border-[var(--color-success)] hover:bg-[var(--color-success-soft)] hover:text-[var(--color-success)] transition-all hover:scale-110 active:scale-90"
              aria-label={`Mark ${task.title} as completed`}
              title="Mark as completed"
            >
              {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" /> : <Check className="h-4 w-4" />}
            </button>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={() => handleAction(onRestore)}
              disabled={isActionPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-success)] bg-[var(--color-success)] text-white hover:opacity-90 transition-all"
              aria-label={`Restore ${task.title} to in-progress`}
              title="Click to restore to in-progress"
            >
              {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          )}

          {isGivenUp && (
            <button
              type="button"
              onClick={() => handleAction(onRestore)}
              disabled={isActionPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)] text-white hover:opacity-90 transition-all"
              aria-label={`Restore ${task.title} to in-progress`}
              title="Click to restore to in-progress"
            >
              {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold leading-snug transition-colors ${
              isMuted ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Badges row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {/* Status chip */}
            <span className={`ui-chip ui-tabular ${statusCfg.badgeClass}`}>
              <CircleDot className="h-3 w-3" />
              {statusCfg.label}
            </span>

            {/* Priority chip */}
            {task.priority && (
              <span className={`ui-chip ${priorityClass}`}>
                {task.priority}
              </span>
            )}

            {/* Project chip */}
            {task.projectId?.name && (
              <span className="ui-chip ui-chip--accent">
                {task.projectId.name}
              </span>
            )}

            {/* Category chip */}
            {task.categoryId?.name && (
              <span className="ui-chip">
                <Tag className="h-3 w-3" />
                {task.categoryId.name}
              </span>
            )}

            {/* Due date badge */}
            {task.dueDate && !isMuted && (
              <span
                className={`ui-chip ui-tabular ${
                  daysLeft < 0
                    ? 'ui-chip--danger'
                    : daysLeft <= 2
                    ? 'ui-chip--warning'
                    : ''
                }`}
              >
                <Clock className="h-3 w-3" />
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0
                  ? 'Due today'
                  : `${daysLeft}d left`}
              </span>
            )}

            {/* Completed timestamp */}
            {isCompleted && task.completedAt && (
              <span className="ui-chip ui-chip--success ui-tabular">
                Done {formatDateTime(task.completedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex shrink-0 items-center gap-1">
          {isInProgress && (
            <button
              type="button"
              onClick={() => onGiveUp?.(taskId)}
              disabled={isActionPending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-warning)] hover:bg-[var(--color-warning-soft)] transition-colors"
              aria-label={`Give up ${task.title}`}
              title="Give up task"
            >
              <Flag className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit?.(task)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label={`Edit ${task.title}`}
            title="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(taskId)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default TodoTaskCard;
```

- [ ] **Step 2: Update `TaskList.jsx` to use `TodoTaskCard` and support custom Skeleton / Empty States**

```jsx
// frontend/src/features/tasks/components/TaskList.jsx
import TodoTaskCard from './TodoTaskCard';

const TaskList = ({
  tasks,
  isLoading = false,
  emptyState = null,
  onAccept,
  onDeny,
  onComplete,
  onGiveUp,
  onRestore,
  onEdit,
  onDelete,
  onClearFilters,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-live="polite" aria-label="Loading tasks">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse ui-section-card rounded-[14px]" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="ui-section-card border-dashed px-6 py-12 text-center">
        <p className="text-base font-semibold text-[var(--color-text)]">
          {emptyState?.title || 'No tasks found'}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
          {emptyState?.description || 'Add a new task to get started.'}
        </p>
        {emptyState?.isFiltered && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ui-btn-secondary mt-4"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TodoTaskCard
          key={task._id || task.id}
          task={task}
          onAccept={onAccept}
          onDeny={onDeny}
          onComplete={onComplete}
          onGiveUp={onGiveUp}
          onRestore={onRestore}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TaskList;
```

- [ ] **Step 3: Run linter and check exports**

Run: `cd frontend && pnpm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/tasks/components/TodoTaskCard.jsx frontend/src/features/tasks/components/TaskList.jsx
git commit -m "feat(tasks): create TodoTaskCard with 4-status interaction model and skeleton loader"
```

---

### Task 3: Implement `TodoTaskToolbar` Component

**Files:**
- Create: `frontend/src/features/tasks/components/TodoTaskToolbar.jsx`
- Modify: `frontend/src/styles/app.css`

**Interfaces:**
- Consumes:
  - `searchTerm: string`
  - `onSearchChange: (value: string) => void`
  - `selectedStatuses: string[]`
  - `onStatusToggle: (statusId: string) => void`
  - `onClearStatuses: () => void`
  - `sortBy: TaskSortOption`
  - `onSortChange: (sort: TaskSortOption) => void`
  - `activeProjectName?: string`
  - `onClearProjectFilter?: () => void`

- [ ] **Step 1: Write `TodoTaskToolbar.jsx`**

```jsx
// frontend/src/features/tasks/components/TodoTaskToolbar.jsx
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Filter, ListFilter, RotateCcw, Search, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'given-up', label: 'Given Up' },
];

const SORT_OPTIONS = [
  { id: 'dueDate', label: 'Due date (Earliest)' },
  { id: 'priority', label: 'Priority (High to Low)' },
  { id: 'title', label: 'Title (A-Z)' },
];

const TodoTaskToolbar = ({
  searchTerm,
  onSearchChange,
  selectedStatuses = [],
  onStatusToggle,
  onClearStatuses,
  sortBy = 'dueDate',
  onSortChange,
  activeProjectName,
  onClearProjectFilter,
}) => {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = Boolean(searchTerm.trim()) || selectedStatuses.length > 0 || Boolean(activeProjectName);

  const statusLabel = selectedStatuses.length === 0
    ? 'All statuses'
    : selectedStatuses.length === 1
    ? STATUS_OPTIONS.find((o) => o.id === selectedStatuses[0])?.label || '1 status'
    : `${selectedStatuses.length} statuses`;

  return (
    <div className="space-y-3">
      {/* Main control row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Box */}
        <div className="relative min-w-[14rem] flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks…"
            className="ui-input !pl-10 !pr-8 !min-h-[2.5rem] text-sm"
            aria-label="Search tasks"
          />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Clear search text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Multi-select Dropdown */}
        <div className="relative" ref={statusRef}>
          <button
            type="button"
            onClick={() => setIsStatusOpen((o) => !o)}
            className={`inline-flex min-h-[2.5rem] items-center gap-2 rounded-[var(--radius-md)] border px-3 text-xs font-semibold transition-colors ${
              selectedStatuses.length > 0
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            aria-expanded={isStatusOpen}
            aria-haspopup="menu"
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>{statusLabel}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStatusOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-[var(--color-text)]">
                <span>Filter Status</span>
                {selectedStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearStatuses}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = selectedStatuses.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onStatusToggle(option.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <span className={`inline-grid h-3.5 w-3.5 place-items-center rounded border ${
                        isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-line)] bg-[var(--color-surface)]'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sort Selector */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort tasks by"
          className="ui-input !w-auto !min-h-[2.5rem] !py-1 !pl-3 !pr-8 text-xs font-semibold text-[var(--color-text-muted)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">Active filters:</span>

          {activeProjectName && (
            <span className="ui-chip ui-chip--accent">
              Project: {activeProjectName}
              <button
                type="button"
                onClick={onClearProjectFilter}
                className="ml-1 hover:text-[var(--color-danger)]"
                aria-label="Remove project filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedStatuses.map((st) => (
            <span key={st} className="ui-chip">
              {STATUS_OPTIONS.find((o) => o.id === st)?.label || st}
              <button
                type="button"
                onClick={() => onStatusToggle(st)}
                className="ml-1 hover:text-[var(--color-danger)]"
                aria-label={`Remove ${st} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {searchTerm.trim() && (
            <span className="ui-chip">
              Keyword: "{searchTerm.trim()}"
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="ml-1 hover:text-[var(--color-danger)]"
                aria-label="Remove search keyword"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onClearStatuses();
              onClearProjectFilter?.();
            }}
            className="ml-auto inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline font-semibold"
          >
            <RotateCcw className="h-3 w-3" />
            Reset all
          </button>
        </div>
      )}
    </div>
  );
};

export default TodoTaskToolbar;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/tasks/components/TodoTaskToolbar.jsx
git commit -m "feat(tasks): add TodoTaskToolbar with integrated search, multi-select status and sort"
```

---

### Task 4: Implement Sticky `ProjectFocusRail` Component

**Files:**
- Create: `frontend/src/features/tasks/components/ProjectFocusRail.jsx`
- Modify: `frontend/src/styles/app.css`

**Interfaces:**
- Consumes:
  - `projects: Project[]`
  - `rawTasks: Task[]` (100% full dataset for stable metrics)
  - `selectedProjectId: string`
  - `onSelectProject: (id: string) => void`
  - `showCompletedProjects: boolean`
  - `onShowCompletedProjectsChange: (show: boolean) => void`
  - `onCreateProject: () => void`
  - `onCreateCategory: () => void`
  - `onAddTaskToProject: (projectId: string) => void`
  - `onCompleteProject: (projectId: string) => Promise<void>`
  - `onRestoreProject: (projectId: string) => Promise<void>`
  - `isLoading: boolean`

- [ ] **Step 1: Write `ProjectFocusRail.jsx`**

```jsx
// frontend/src/features/tasks/components/ProjectFocusRail.jsx
import { useMemo } from 'react';
import { Check, FolderPlus, Layers, Plus, RotateCcw } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { calculateProjectMetrics } from '../utils/taskFilterPipeline';
import { getProjectColor } from '@/shared/utils/projectColor';
import { canCompleteProject, filterProjectsByVisibility, isCompletedProject } from '@/shared/utils/projectStatus';

const ALL_PROJECT_FILTER = 'all-projects';
const STANDALONE_PROJECT_FILTER = 'standalone-projects';

const ProjectFocusRail = ({
  projects = [],
  rawTasks = [],
  selectedProjectId = ALL_PROJECT_FILTER,
  onSelectProject,
  showCompletedProjects = false,
  onShowCompletedProjectsChange,
  onCreateProject,
  onCreateCategory,
  onAddTaskToProject,
  onCompleteProject,
  onRestoreProject,
  isLoading = false,
}) => {
  // 1. Overall Workspace Metrics (Independent of any filter)
  const overallMetrics = useMemo(() => {
    const total = rawTasks.length;
    const completed = rawTasks.filter((t) => t.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, progress };
  }, [rawTasks]);

  // 2. Standalone Metrics
  const standaloneMetrics = useMemo(() => {
    return calculateProjectMetrics(rawTasks, null);
  }, [rawTasks]);

  // 3. Visible Projects list
  const visibleProjects = useMemo(() => {
    return filterProjectsByVisibility(projects, showCompletedProjects);
  }, [projects, showCompletedProjects]);

  if (isLoading) {
    return (
      <aside className="ui-project-focus-rail space-y-4">
        <div className="h-24 animate-pulse ui-section-card rounded-[14px]" />
        <div className="h-64 animate-pulse ui-section-card rounded-[14px]" />
      </aside>
    );
  }

  return (
    <aside className="ui-project-focus-rail space-y-4" aria-label="Project focus rail">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="ui-page-kicker !text-[11px]">Workstreams</p>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Project Focus</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCreateCategory}
            className="ui-btn-secondary !min-h-[2rem] !px-2.5 !text-xs"
            title="Add Category"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Category</span>
          </button>
          <button
            type="button"
            onClick={onCreateProject}
            className="ui-btn-primary !min-h-[2rem] !px-2.5 !text-xs"
            title="Add Project"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Project</span>
          </button>
        </div>
      </div>

      {/* Overall Progress Widget */}
      <ProgressBar
        title="Workspace Progress"
        completed={overallMetrics.completed}
        total={overallMetrics.total}
        compact
      />

      {/* Filter Options (Completed project toggle) */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCompletedProjects}
            onChange={(e) => onShowCompletedProjectsChange?.(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--color-line)] accent-[var(--color-accent)]"
          />
          <span>Show Completed Projects</span>
        </label>
        <span>{visibleProjects.length} projects</span>
      </div>

      {/* Scrollable Project Cards Container */}
      <div className="space-y-2.5 max-h-[calc(100dvh-18rem)] overflow-y-auto pr-1">
        {/* All Tasks Card */}
        <article
          onClick={() => onSelectProject(ALL_PROJECT_FILTER)}
          className={`ui-section-card relative cursor-pointer p-3.5 transition-all duration-150 ${
            selectedProjectId === ALL_PROJECT_FILTER
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
              : 'hover:border-[var(--color-accent)]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">All Tasks</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Every task in your workspace</p>
            </div>
            <span className="ui-chip ui-tabular !text-[11px] !min-h-[1.5rem]">
              {overallMetrics.completed}/{overallMetrics.total}
            </span>
          </div>
        </article>

        {/* Standalone (No Project) Card */}
        <article
          onClick={() => onSelectProject(STANDALONE_PROJECT_FILTER)}
          className={`ui-section-card relative cursor-pointer p-3.5 transition-all duration-150 ${
            selectedProjectId === STANDALONE_PROJECT_FILTER
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
              : 'hover:border-[var(--color-accent)]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">No Project</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Standalone daily tasks</p>
            </div>
            <span className="ui-chip ui-tabular !text-[11px] !min-h-[1.5rem]">
              {standaloneMetrics.completed}/{standaloneMetrics.total}
            </span>
          </div>
        </article>

        {/* Concrete Projects */}
        {visibleProjects.map((project) => {
          const isSelected = selectedProjectId === project._id;
          const isCompleted = isCompletedProject(project);
          const projectColor = getProjectColor(project);
          const metrics = calculateProjectMetrics(rawTasks, project._id);

          const projectTasks = rawTasks.filter((t) => {
            const pid = t.projectId?._id || t.projectId;
            return pid === project._id;
          });
          const canComplete = canCompleteProject(projectTasks);

          return (
            <article
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              className={`ui-section-card relative cursor-pointer p-3.5 transition-all duration-150 ${
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
                  : 'hover:border-[var(--color-accent)]'
              } ${isCompleted ? 'opacity-75' : ''}`}
              style={{ borderLeftColor: projectColor, borderLeftWidth: '5px' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {project.description}
                    </p>
                  )}
                </div>

                <span className="ui-chip ui-tabular !text-[11px] !min-h-[1.5rem] shrink-0">
                  {metrics.completed}/{metrics.total}
                </span>
              </div>

              {/* Progress bar inside card */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
                  <span>Progress</span>
                  <span className="ui-tabular font-medium">{metrics.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-200"
                    style={{ width: `${metrics.progress}%` }}
                  />
                </div>
              </div>

              {/* Project Action Row */}
              <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-[var(--color-line)] pt-2" onClick={(e) => e.stopPropagation()}>
                {canComplete && !isCompleted && (
                  <button
                    type="button"
                    onClick={() => onCompleteProject?.(project._id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-success)] bg-[var(--color-success-soft)] px-2 text-[11px] font-semibold text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    <span>Complete</span>
                  </button>
                )}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => onRestoreProject?.(project._id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAddTaskToProject?.(project._id)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Task</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
};

export default ProjectFocusRail;
```

- [ ] **Step 2: Add CSS rules for sticky behavior in `app.css`**

```css
/* In frontend/src/styles/app.css */
.ui-project-focus-rail {
  position: sticky;
  top: calc(var(--topbar-height, 4rem) + 1rem);
  max-height: calc(100dvh - var(--topbar-height, 4rem) - 2.5rem);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/tasks/components/ProjectFocusRail.jsx frontend/src/styles/app.css
git commit -m "feat(tasks): create sticky ProjectFocusRail with decoupled stable metrics"
```

---

### Task 5: Assemble Redesigned `TodoPage.jsx` & Wire All Mutations

**Files:**
- Modify: `frontend/src/features/tasks/TodoPage.jsx`

**Interfaces:**
- Combines:
  - `TodoTaskToolbar`
  - `TaskList` + `TodoTaskCard`
  - `ProjectFocusRail`
  - `useTasksQuery`, `useProjectsQuery`
  - `useCreateTaskMutation`, `useUpdateTaskMutation`, `useDeleteTaskMutation`, `useStartTaskMutation`, `useFinishTaskMutation`, `useGiveUpTaskMutation`, `useRestoreTaskMutation`

- [ ] **Step 1: Refactor `TodoPage.jsx` to assemble the 2-column layout and connect all actions**

```jsx
// frontend/src/features/tasks/TodoPage.jsx
import { useEffect, useMemo, useState } from 'react';
import ActionButtons from './components/GenTaskButton';
import AddTaskButton from './components/AddTaskButton';
import TaskDetailButton from './components/TaskDetailButton';
import TodoTaskToolbar from './components/TodoTaskToolbar';
import TaskList from './components/TaskList';
import ProjectFocusRail from './components/ProjectFocusRail';
import AddCategoryForm from './components/Form/AddCategoryForm';
import AddProjectForm from './components/Form/AddProjectForm';
import { useTasksQuery } from './api/taskQueries';
import { useProjectsQuery } from './api/projectQueries';
import {
  useDeleteTaskMutation,
  useFinishTaskMutation,
  useGiveUpTaskMutation,
  useRestoreTaskMutation,
  useStartTaskMutation,
  useUpdateTaskMutation,
} from './api/taskMutations';
import { useUpdateProjectMutation } from './api/projectMutations';
import { filterAndSortTasks } from './utils/taskFilterPipeline';
import { PROJECT_STATUS } from '@/shared/utils/projectStatus';
import { getApiErrorMessage } from '@/shared/services/apiError';
import { X } from 'lucide-react';

const ALL_PROJECT_FILTER = 'all-projects';
const STANDALONE_PROJECT_FILTER = 'standalone-projects';

const TodoPage = () => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [initialTaskProjectId, setInitialTaskProjectId] = useState('');

  // Local filter & sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(ALL_PROJECT_FILTER);
  const [sortBy, setSortBy] = useState('dueDate');
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);

  // Queries & Mutations
  const tasksQuery = useTasksQuery();
  const projectsQuery = useProjectsQuery();

  const updateTaskMutation = useUpdateTaskMutation();
  const startTaskMutation = useStartTaskMutation();
  const finishTaskMutation = useFinishTaskMutation();
  const giveUpTaskMutation = useGiveUpTaskMutation();
  const restoreTaskMutation = useRestoreTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const updateProjectMutation = useUpdateProjectMutation();

  const rawTasks = useMemo(() => tasksQuery.data || [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading;
  const isFetching = tasksQuery.isFetching || projectsQuery.isFetching;
  const errorMessage = tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, 'Failed to load tasks.')
    : projectsQuery.isError
    ? getApiErrorMessage(projectsQuery.error, 'Failed to load projects.')
    : '';

  // Lock body scroll on modals
  useEffect(() => {
    const isAnyModalOpen = isGiveUpModalOpen || isDeleteModalOpen || isAddCategoryModalOpen || isAddProjectModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isGiveUpModalOpen, isDeleteModalOpen, isAddCategoryModalOpen, isAddProjectModalOpen]);

  // Pure filtering & sorting pipeline
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks({
      tasks: rawTasks,
      searchTerm,
      selectedStatuses,
      selectedProjectId,
      sortBy,
    });
  }, [rawTasks, searchTerm, selectedStatuses, selectedProjectId, sortBy]);

  // Overall workspace counters (pure and stable)
  const remainingCount = useMemo(() => {
    return rawTasks.filter((t) => t.status === 'in-progress' || t.status === 'pending').length;
  }, [rawTasks]);

  const completedCount = useMemo(() => {
    return rawTasks.filter((t) => t.status === 'completed').length;
  }, [rawTasks]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === ALL_PROJECT_FILTER || selectedProjectId === STANDALONE_PROJECT_FILTER) {
      return null;
    }
    return projects.find((p) => p._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Handlers for Task Actions (Calendar-aligned)
  const handleAcceptTask = async (taskId) => {
    try {
      await startTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to accept task.'));
    }
  };

  const handleDenyTask = async (taskId) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete task.'));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await finishTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to complete task.'));
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      await restoreTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to restore task.'));
    }
  };

  const handleGiveUpClick = (taskId) => {
    setTaskToGiveUp(taskId);
    setIsGiveUpModalOpen(true);
  };

  const confirmGiveUp = async () => {
    try {
      await giveUpTaskMutation.mutateAsync(taskToGiveUp);
      setIsGiveUpModalOpen(false);
      setTaskToGiveUp(null);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to give up task.'));
    }
  };

  const handleDeleteClick = (taskId) => {
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTaskMutation.mutateAsync(taskToDelete);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete task.'));
    }
  };

  const handleCompleteProject = async (projectId) => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        payload: { status: PROJECT_STATUS.COMPLETED },
      });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(ALL_PROJECT_FILTER);
      }
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to complete project.'));
    }
  };

  const handleRestoreProject = async (projectId) => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        payload: { status: PROJECT_STATUS.ACTIVE },
      });
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to restore project.'));
    }
  };

  const openAddTask = (projectId = '') => {
    const project = projects.find((p) => p._id === projectId);
    setInitialTaskProjectId(project?.status === PROJECT_STATUS.COMPLETED ? '' : projectId);
    setIsModalOpen(true);
  };

  // Status toggle handler
  const handleStatusToggle = (statusId) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusId) ? prev.filter((s) => s !== statusId) : [...prev, statusId]
    );
  };

  const isFiltered = Boolean(searchTerm.trim()) || selectedStatuses.length > 0 || selectedProjectId !== ALL_PROJECT_FILTER;

  const emptyStateInfo = useMemo(() => {
    if (isFiltered) {
      return {
        title: 'No tasks match current filters',
        description: 'Try adjusting your search query, status filters, or project selection.',
        isFiltered: true,
      };
    }
    return {
      title: 'No tasks in this workspace yet',
      description: 'Add your first task to start building your daily list and project progress.',
      isFiltered: false,
    };
  }, [isFiltered]);

  return (
    <>
      <AddTaskButton
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialTaskProjectId('');
        }}
        initialProjectId={initialTaskProjectId}
      />

      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
      />

      <div className="ui-page-shell">
        {/* Main Page Header */}
        <header className="ui-page-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="ui-page-kicker">Workspace</p>
              <h1 className="ui-page-title">Today</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                <span className="ui-chip ui-chip--accent ui-tabular font-semibold">
                  {remainingCount} remaining
                </span>
                <span className="ui-chip ui-tabular">
                  {completedCount} completed
                </span>
                {selectedProject && (
                  <span className="ui-chip ui-chip--accent font-medium">
                    Focused on: {selectedProject.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAddTask()}
                className="ui-btn-primary"
              >
                + Add Task
              </button>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <section className="ui-section-card ui-card-padding">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-warning)]">Unable to load latest todo data</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  tasksQuery.refetch();
                  projectsQuery.refetch();
                }}
                className="ui-btn-secondary"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col-reverse lg:flex-row items-start gap-6">
          {/* Left Column: Main Task Workspace (~65–70%) */}
          <main className="w-full flex-1 min-w-0 space-y-4">
            <TodoTaskToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              onClearStatuses={() => setSelectedStatuses([])}
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeProjectName={selectedProject?.name}
              onClearProjectFilter={() => setSelectedProjectId(ALL_PROJECT_FILTER)}
            />

            <TaskList
              tasks={filteredTasks}
              isLoading={isLoading}
              emptyState={emptyStateInfo}
              onAccept={handleAcceptTask}
              onDeny={handleDenyTask}
              onComplete={handleCompleteTask}
              onGiveUp={handleGiveUpClick}
              onRestore={handleRestoreTask}
              onEdit={(task) => {
                setSelectedTask(task);
                setIsEditModalOpen(true);
              }}
              onDelete={handleDeleteClick}
              onClearFilters={() => {
                setSearchTerm('');
                setSelectedStatuses([]);
                setSelectedProjectId(ALL_PROJECT_FILTER);
              }}
            />
          </main>

          {/* Right Column: Sticky Project Focus Rail (~30–35%, min 320px) */}
          <div className="w-full lg:w-[22rem] xl:w-[24rem] shrink-0">
            <ProjectFocusRail
              projects={projects}
              rawTasks={rawTasks}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              showCompletedProjects={showCompletedProjects}
              onShowCompletedProjectsChange={setShowCompletedProjects}
              onCreateProject={() => setIsAddProjectModalOpen(true)}
              onCreateCategory={() => setIsAddCategoryModalOpen(true)}
              onAddTaskToProject={openAddTask}
              onCompleteProject={handleCompleteProject}
              onRestoreProject={handleRestoreProject}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Give Up Dialog */}
      {isGiveUpModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => { setIsGiveUpModalOpen(false); setTaskToGiveUp(null); }}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="giveup-dialog-title"
          >
            <div className="ui-modal-header">
              <h2 id="giveup-dialog-title" className="text-xl font-semibold text-[var(--color-text)]">Give Up Task</h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                Are you sure you want to give up this task? You can restore it to in-progress at any time.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsGiveUpModalOpen(false); setTaskToGiveUp(null); }} className="ui-btn-secondary flex-1">Cancel</button>
                <button type="button" onClick={confirmGiveUp} className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-white hover:opacity-90">Give Up</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="ui-modal-header">
              <h2 id="delete-dialog-title" className="text-xl font-semibold text-[var(--color-text)]">Delete Task</h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }} className="ui-btn-secondary flex-1">Cancel</button>
                <button type="button" onClick={confirmDelete} className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-white hover:opacity-90">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddCategoryModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-cat-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Create</p>
                <h2 id="add-cat-title" className="text-xl font-semibold text-[var(--color-text)]">Add Category</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="ui-modal-close-button"
                aria-label="Close add category dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddCategoryForm
                onClose={() => setIsAddCategoryModalOpen(false)}
                onCategoryCreated={() => setIsAddCategoryModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isAddProjectModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddProjectModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-proj-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Create</p>
                <h2 id="add-proj-title" className="text-xl font-semibold text-[var(--color-text)]">Add Project</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="ui-modal-close-button"
                aria-label="Close add project dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                onClose={() => setIsAddProjectModalOpen(false)}
                onProjectCreated={(project) => {
                  setIsAddProjectModalOpen(false);
                  setSelectedProjectId(project?._id || ALL_PROJECT_FILTER);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodoPage;
```

- [ ] **Step 2: Run typecheck and clean up obsolete components if any**

Run: `cd frontend && pnpm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/tasks/TodoPage.jsx
git commit -m "feat(tasks): assemble redesigned 2-column TodoPage with sticky project rail"
```

---

### Task 6: Full Verification & Responsive Polish

**Files:**
- Modify: `frontend/src/styles/app.css` (fine-tune responsive paddings, safe area for floating assistant)

- [ ] **Step 1: Check CSS safe margins for Floating Assistant**

Ensure `.ui-project-focus-rail` and main containers have sufficient bottom padding so the floating assistant button does not obscure buttons on smaller screens:
```css
.ui-project-focus-rail {
  position: sticky;
  top: calc(var(--topbar-height, 4rem) + 1rem);
  max-height: calc(100dvh - var(--topbar-height, 4rem) - 3rem);
}
```

- [ ] **Step 2: Run frontend test suite & typecheck**

Run: `cd frontend && pnpm test && pnpm run typecheck`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/app.css
git commit -m "style(tasks): polish 2-column layout and assistant safe area"
```
