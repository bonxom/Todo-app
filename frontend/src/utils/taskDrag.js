const emptyValue = '';
let isControlKeyPressed = false;
let lastControlKeyDownAt = 0;
let isTaskDragActive = false;
let isModifierTrackingInitialized = false;

const initializeModifierTracking = () => {
  if (isModifierTrackingInitialized || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Control') {
      isControlKeyPressed = true;
      lastControlKeyDownAt = Date.now();
    }
  }, true);

  window.addEventListener('keyup', (event) => {
    if (event.key === 'Control') {
      isControlKeyPressed = false;
    }
  }, true);

  window.addEventListener('blur', () => {
    if (isTaskDragActive) {
      return;
    }

    isControlKeyPressed = false;
  });

  window.addEventListener('dragend', () => {
    isTaskDragActive = false;
    isControlKeyPressed = false;
  }, true);

  window.addEventListener('drop', () => {
    isTaskDragActive = false;
    isControlKeyPressed = false;
  }, true);

  isModifierTrackingInitialized = true;
};

initializeModifierTracking();

const getRelationId = (value) => value?._id || value || emptyValue;

export const isCopyDragRequested = (event) => {
  const nativeCtrlKey = Boolean(event?.ctrlKey);
  const modifierState = Boolean(event?.getModifierState?.('Control'));
  const dragStartCopyMode = event?.dataTransfer?.getData?.('copyMode') === 'true';
  const shouldCopy = nativeCtrlKey || modifierState || isControlKeyPressed || dragStartCopyMode;

  return {
    shouldCopy,
    nativeCtrlKey,
    modifierState,
    trackedCtrlKey: isControlKeyPressed,
    dragStartCopyMode,
  };
};

const buildTaskCopyPayload = (task) => ({
  title: task?.title || '',
  description: task?.description || '',
  priority: task?.priority || 'Medium',
  categoryId: getRelationId(task?.categoryId),
  projectId: getRelationId(task?.projectId),
  projectStatus: task?.projectId?.status || emptyValue,
  startDate: task?.startDate || emptyValue,
  dueDate: task?.dueDate || emptyValue,
});

export const setTaskDragData = (event, task) => {
  const taskId = task?._id || task?.id || emptyValue;

  if (!taskId) return;

  const taskCopyPayload = buildTaskCopyPayload(task);
  const copyRequestedAtDragStart = Boolean(
    event.ctrlKey ||
    event.getModifierState?.('Control') ||
    isControlKeyPressed ||
    Date.now() - lastControlKeyDownAt < 2000
  );

  isTaskDragActive = true;
  event.dataTransfer.effectAllowed = 'copyMove';
  event.dataTransfer.setData('taskId', taskId);
  event.dataTransfer.setData('currentCategoryId', getRelationId(task.categoryId));
  event.dataTransfer.setData('currentProjectId', getRelationId(task.projectId));
  event.dataTransfer.setData('currentDueDate', task.dueDate || emptyValue);
  event.dataTransfer.setData('taskCopyPayload', JSON.stringify(taskCopyPayload));
  event.dataTransfer.setData('copyMode', copyRequestedAtDragStart ? 'true' : 'false');
  event.dataTransfer.setData('text/plain', task.title || 'Task');
};

export const getTaskDragData = (event) => {
  let taskCopyPayload = null;

  try {
    const rawPayload = event.dataTransfer.getData('taskCopyPayload');
    taskCopyPayload = rawPayload ? JSON.parse(rawPayload) : null;
  } catch {
    taskCopyPayload = null;
  }

  return {
    taskId: event.dataTransfer.getData('taskId'),
    currentCategoryId: event.dataTransfer.getData('currentCategoryId'),
    currentProjectId: event.dataTransfer.getData('currentProjectId'),
    currentDueDate: event.dataTransfer.getData('currentDueDate'),
    taskCopyPayload,
  };
};
