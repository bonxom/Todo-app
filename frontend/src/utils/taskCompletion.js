import { taskService } from '../api/apiService';

export const getNextCompletionStatus = (task) => (
  task?.status === 'completed' ? 'in-progress' : 'completed'
);

export const toggleTaskCompletion = async (task) => {
  const taskId = task?._id || task?.id;

  if (!taskId) {
    throw new Error('Task id is required to update completion.');
  }

  return taskService.updateTask(taskId, {
    status: getNextCompletionStatus(task),
  });
};

export const getNextGiveUpStatus = (task) => (
  task?.status === 'given-up' ? 'in-progress' : 'given-up'
);

export const toggleTaskGiveUp = async (task) => {
  const taskId = task?._id || task?.id;

  if (!taskId) {
    throw new Error('Task id is required to update give-up status.');
  }

  if (task?.status === 'given-up') {
    return taskService.restoreTask(taskId);
  }

  return taskService.giveUpTask(taskId);
};
