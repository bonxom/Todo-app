export const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

export const isCompletedProject = (project) => project?.status === PROJECT_STATUS.COMPLETED;

export const isActiveProject = (project) => !isCompletedProject(project);

export const canCompleteProject = (tasks = []) => (
  tasks.length > 0 && tasks.every((task) => task.status === 'completed' || task.status === 'given-up')
);

export const filterProjectsByVisibility = (projects = [], showCompletedProjects = false) => (
  showCompletedProjects ? projects : projects.filter(isActiveProject)
);
