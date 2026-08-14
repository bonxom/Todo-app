export const DEFAULT_PROJECT_COLOR = '#E5E7EB';

export const getProjectColor = (project) => {
  const color = typeof project?.color === 'string' ? project.color.trim() : '';
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color.toUpperCase() : DEFAULT_PROJECT_COLOR;
};

export const getTaskProjectColor = (task) => getProjectColor(task?.projectId);
