export const UI_INTERACTIVE_CATALOG_ID =
  "urn:orbit:a2ui:interactive:v1" as const;

export type UiActionName = "task.complete";

export interface UiActionBinding {
  id: string;
  key: string;
  name: UiActionName;
  taskId: string;
}

export type UiActionStateStatus =
  "loading" | "ready" | "pending" | "uncertain" | "succeeded" | "unavailable";

export interface UiActionState {
  status: UiActionStateStatus;
  disabled: boolean;
  reason?: string;
}

export interface UiActionLocation {
  conversationId: string;
  turnId: string;
  surfaceId: string;
}

export interface UiActionInput {
  requestId: string;
  actionId: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in-progress" | "completed" | "given-up";
  priority: "Low" | "Medium" | "High";
  categoryId: string | null;
  projectId: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UiActionResult {
  requestId: string;
  actionId: string;
  outcome: "succeeded";
  task: TaskDto;
}

export interface UiActionOutcome extends UiActionResult {
  turnId: string;
  surfaceId: string;
  committedAt: string;
}
