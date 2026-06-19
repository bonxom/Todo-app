import { useContext, useMemo } from 'react';
import TaskFilterContext from './TaskFilterContext';

export const useTaskFilter = () => {
  const context = useContext(TaskFilterContext);

  if (!context) {
    throw new Error('useTaskFilter must be used within TaskFilterProvider');
  }

  return context;
};

export const useVisibleTasks = (tasks) => {
  const { filterTasks } = useTaskFilter();

  return useMemo(() => filterTasks(tasks), [filterTasks, tasks]);
};
