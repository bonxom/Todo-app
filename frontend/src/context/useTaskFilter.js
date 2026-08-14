import { useMemo } from 'react';
import { useTaskFilterStore, filterTasks } from '../stores/useTaskFilterStore';

export const useTaskFilter = () => {
  const onlyInProgress = useTaskFilterStore((state) => state.onlyInProgress);
  const setOnlyInProgress = useTaskFilterStore((state) => state.setOnlyInProgress);
  const toggleOnlyInProgress = useTaskFilterStore((state) => state.toggleOnlyInProgress);

  return {
    onlyInProgress,
    setOnlyInProgress,
    toggleOnlyInProgress,
    filterTasks: (tasks) => filterTasks(tasks, onlyInProgress),
  };
};

export const useVisibleTasks = (tasks) => {
  const onlyInProgress = useTaskFilterStore((state) => state.onlyInProgress);
  return useMemo(() => filterTasks(tasks, onlyInProgress), [tasks, onlyInProgress]);
};
