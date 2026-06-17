const emptyValue = '';

const getRelationId = (value) => value?._id || value || emptyValue;

export const setTaskDragData = (event, task) => {
  const taskId = task?._id || task?.id || emptyValue;

  if (!taskId) return;

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('taskId', taskId);
  event.dataTransfer.setData('currentCategoryId', getRelationId(task.categoryId));
  event.dataTransfer.setData('currentProjectId', getRelationId(task.projectId));
  event.dataTransfer.setData('currentDueDate', task.dueDate || emptyValue);
  event.dataTransfer.setData('text/plain', task.title || 'Task');
};

export const getTaskDragData = (event) => ({
  taskId: event.dataTransfer.getData('taskId'),
  currentCategoryId: event.dataTransfer.getData('currentCategoryId'),
  currentProjectId: event.dataTransfer.getData('currentProjectId'),
  currentDueDate: event.dataTransfer.getData('currentDueDate'),
});
