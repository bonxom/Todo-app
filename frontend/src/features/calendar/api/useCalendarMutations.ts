import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../../shared/services/taskService";
import { projectService } from "../../../shared/services/projectService";
import { normalizeEntityResponse } from "../../../shared/services/projectHelpers";
import { invalidateTaskDependents } from "../../tasks/api/invalidation";
import { taskKeys } from "../../tasks/api/taskKeys";
import { projectKeys } from "../../tasks/api/projectKeys";
import {
  createCalendarSnapshot,
  getTaskId,
  removeTaskFromCollections,
  replaceProjectInList,
  restoreSnapshot,
  upsertTaskInCollections,
  type CalendarSnapshot,
} from "./calendarCache";
import { generateOptimisticId } from "../../../shared/utils/id";
import type { EntityId, Project, ProjectStatus, Task, TaskMutationPayload, TaskStatus } from "../../../shared/types/domain";

export const useCalendarMutations = () => {
  const queryClient = useQueryClient();

  const statusMutation = useMutation<
    Task,
    Error,
    { task: Task; nextStatus: TaskStatus },
    { snapshot: CalendarSnapshot }
  >({
    mutationFn: async ({ task, nextStatus }) => {
      const taskId = getTaskId(task);
      if (!taskId) throw new Error("Task ID is required");

      if (nextStatus === "completed") {
        return taskService.finishTask(taskId);
      }
      if (nextStatus === "in-progress") {
        return task.status === "pending"
          ? taskService.startTask(taskId)
          : taskService.restoreTask(taskId);
      }
      if (nextStatus === "given-up") {
        return taskService.giveUpTask(taskId);
      }
      return taskService.updateTask(taskId, { status: nextStatus });
    },
    onMutate: async ({ task, nextStatus }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.all }),
        queryClient.cancelQueries({ queryKey: projectKeys.all }),
      ]);
      const snapshot = createCalendarSnapshot(queryClient);

      const now = new Date().toISOString();
      const optimisticTask: Task = {
        ...task,
        status: nextStatus,
        completedAt:
          nextStatus === "completed"
            ? now
            : nextStatus === "in-progress"
            ? null
            : task.completedAt,
      };

      upsertTaskInCollections(queryClient, optimisticTask);
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (response) => {
      const normalized = normalizeEntityResponse<Task>(response, "task");
      upsertTaskInCollections(queryClient, normalized);
    },
    onSettled: async () => {
      await invalidateTaskDependents(queryClient);
    },
  });

  const deleteMutation = useMutation<unknown, Error, EntityId, { snapshot: CalendarSnapshot }>({
    mutationFn: (taskId: EntityId) => taskService.deleteTask(taskId),
    onMutate: async (taskId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.all }),
        queryClient.cancelQueries({ queryKey: projectKeys.all }),
      ]);
      const snapshot = createCalendarSnapshot(queryClient);
      removeTaskFromCollections(queryClient, taskId);
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSettled: async () => {
      await invalidateTaskDependents(queryClient);
    },
  });

  const dueDateMutation = useMutation<
    Task,
    Error,
    { task: Task; nextDueDate: string | null },
    { snapshot: CalendarSnapshot }
  >({
    mutationFn: async ({ task, nextDueDate }) => {
      const taskId = getTaskId(task);
      if (!taskId) throw new Error("Task ID is required");
      return taskService.updateTask(taskId, { dueDate: nextDueDate });
    },
    onMutate: async ({ task, nextDueDate }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.all }),
        queryClient.cancelQueries({ queryKey: projectKeys.all }),
      ]);
      const snapshot = createCalendarSnapshot(queryClient);
      upsertTaskInCollections(queryClient, { ...task, dueDate: nextDueDate || undefined });
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (response) => {
      const normalized = normalizeEntityResponse<Task>(response, "task");
      upsertTaskInCollections(queryClient, normalized);
    },
    onSettled: async () => {
      await invalidateTaskDependents(queryClient);
    },
  });

  const copyMutation = useMutation<
    Task,
    Error,
    { taskCopyPayload: Partial<TaskMutationPayload>; nextDueDate: string },
    { snapshot: CalendarSnapshot; temporaryId: string }
  >({
    mutationFn: ({ taskCopyPayload, nextDueDate }) =>
      taskService.createTask({
        ...taskCopyPayload,
        status: "in-progress",
        dueDate: nextDueDate,
      }),
    onMutate: async ({ taskCopyPayload, nextDueDate }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: taskKeys.all }),
        queryClient.cancelQueries({ queryKey: projectKeys.all }),
      ]);
      const snapshot = createCalendarSnapshot(queryClient);

      const temporaryId = generateOptimisticId("optimistic");
      const optimisticTask: Task = {
        _id: temporaryId,
        title: taskCopyPayload.title || "",
        description: taskCopyPayload.description,
        status: "in-progress",
        priority: taskCopyPayload.priority || "Medium",
        categoryId: taskCopyPayload.categoryId || null,
        projectId: taskCopyPayload.projectId || null,
        startDate: taskCopyPayload.startDate || new Date().toISOString(),
        dueDate: nextDueDate,
        completedAt: null,
      };

      upsertTaskInCollections(queryClient, optimisticTask);
      return { snapshot, temporaryId };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (response, _variables, context) => {
      const normalized = normalizeEntityResponse<Task>(response, "task");
      upsertTaskInCollections(queryClient, normalized, context?.temporaryId);
    },
    onSettled: async () => {
      await invalidateTaskDependents(queryClient);
    },
  });

  const projectStatusMutation = useMutation<
    Project,
    Error,
    { projectId: EntityId; status: ProjectStatus },
    { snapshot: CalendarSnapshot }
  >({
    mutationFn: ({ projectId, status }) => projectService.updateProject(projectId, { status }),
    onMutate: async ({ projectId, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: projectKeys.all }),
        queryClient.cancelQueries({ queryKey: taskKeys.all }),
      ]);
      const snapshot = createCalendarSnapshot(queryClient);
      replaceProjectInList(queryClient, { _id: projectId, status });
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (updatedProject) => {
      replaceProjectInList(queryClient, updatedProject);
    },
    onSettled: async () => {
      await invalidateTaskDependents(queryClient);
    },
  });

  return {
    changeTaskStatus: (task: Task, nextStatus: TaskStatus) =>
      statusMutation.mutateAsync({ task, nextStatus }),
    deleteTask: (taskId: EntityId) => deleteMutation.mutateAsync(taskId),
    changeTaskDueDate: (task: Task, nextDueDate: string | null) =>
      dueDateMutation.mutateAsync({ task, nextDueDate }),
    copyTask: (taskCopyPayload: Partial<TaskMutationPayload>, nextDueDate: string) =>
      copyMutation.mutateAsync({ taskCopyPayload, nextDueDate }),
    changeProjectStatus: (projectId: EntityId, status: ProjectStatus) =>
      projectStatusMutation.mutateAsync({ projectId, status }),
    isMutating:
      statusMutation.isPending ||
      deleteMutation.isPending ||
      dueDateMutation.isPending ||
      copyMutation.isPending ||
      projectStatusMutation.isPending,
  };
};
