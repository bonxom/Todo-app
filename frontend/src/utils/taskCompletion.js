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
