export const IN_PROGRESS_STATUS = 'in-progress';

export const isInProgressTask = (task) => task?.status === IN_PROGRESS_STATUS;

export const applyGlobalInProgressFilter = (tasks, onlyInProgress) => {
  const taskList = Array.isArray(tasks) ? tasks : [];

  if (!onlyInProgress) {
    return taskList;
  }

  return taskList.filter(isInProgressTask);
};
