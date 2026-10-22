import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { taskService } from "../../../shared/services/taskService";
import type {
  EntityId,
  Task,
  TaskMutationPayload,
} from "../../../shared/types/domain";
import { invalidateTaskDependents } from "./invalidation";
import { notifyTaskStatus } from "../hooks/taskStatusTransitions";

export const useCreateTaskMutation = (
  options?: UseMutationOptions<Task, Error, Partial<TaskMutationPayload>>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TaskMutationPayload>) =>
      taskService.createTask(payload),
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export interface UpdateTaskVariables {
  taskId: EntityId;
  payload: Partial<TaskMutationPayload>;
}

export const useUpdateTaskMutation = (
  options?: UseMutationOptions<Task, Error, UpdateTaskVariables>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, payload }: UpdateTaskVariables) => {
      const task = await taskService.updateTask(taskId, payload);
      if (payload.status) notifyTaskStatus(taskId, payload.status);
      return task;
    },
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useDeleteTaskMutation = (
  options?: UseMutationOptions<unknown, Error, EntityId>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: EntityId) => taskService.deleteTask(taskId),
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useStartTaskMutation = (
  options?: UseMutationOptions<Task, Error, EntityId>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: EntityId) => {
      const task = await taskService.startTask(taskId);
      notifyTaskStatus(taskId, "in-progress");
      return task;
    },
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useFinishTaskMutation = (
  options?: UseMutationOptions<Task, Error, EntityId>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: EntityId) => {
      const task = await taskService.finishTask(taskId);
      notifyTaskStatus(taskId, "completed");
      return task;
    },
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useGiveUpTaskMutation = (
  options?: UseMutationOptions<Task, Error, EntityId>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: EntityId) => {
      const task = await taskService.giveUpTask(taskId);
      notifyTaskStatus(taskId, "given-up");
      return task;
    },
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};

export const useRestoreTaskMutation = (
  options?: UseMutationOptions<Task, Error, EntityId>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: EntityId) => {
      const task = await taskService.restoreTask(taskId);
      notifyTaskStatus(taskId, "in-progress");
      return task;
    },
    onSuccess: async (...args) => {
      await invalidateTaskDependents(queryClient);
      await options?.onSuccess?.(...args);
    },
    ...options,
  });
};
