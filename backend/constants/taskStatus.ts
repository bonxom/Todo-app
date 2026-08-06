export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Completed = 'completed',
  GivenUp = 'given-up',
}

export const TASK_STATUSES: string[] = [
  TaskStatus.Pending,
  TaskStatus.InProgress,
  TaskStatus.Completed,
  TaskStatus.GivenUp,
];

export const FINISHED_STATUSES: string[] = [TaskStatus.Completed, TaskStatus.GivenUp];

export const ACTIVE_STATUSES: string[] = [TaskStatus.Pending, TaskStatus.InProgress];
