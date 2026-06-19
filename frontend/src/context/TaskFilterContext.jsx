import { createContext, useCallback, useMemo, useState } from 'react';
import { applyGlobalInProgressFilter } from '../utils/taskFilters';

const TaskFilterContext = createContext(null);

export const TaskFilterProvider = ({ children }) => {
  const [onlyInProgress, setOnlyInProgress] = useState(false);

  const toggleOnlyInProgress = useCallback(() => {
    setOnlyInProgress((current) => !current);
  }, []);

  const filterTasks = useCallback(
    (tasks) => applyGlobalInProgressFilter(tasks, onlyInProgress),
    [onlyInProgress]
  );

  const value = useMemo(
    () => ({
      onlyInProgress,
      setOnlyInProgress,
      toggleOnlyInProgress,
      filterTasks,
    }),
    [filterTasks, onlyInProgress, toggleOnlyInProgress]
  );

  return (
    <TaskFilterContext.Provider value={value}>
      {children}
    </TaskFilterContext.Provider>
  );
};

export default TaskFilterContext;
