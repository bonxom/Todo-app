import { useCallback, useState } from 'react';
import TaskRefreshContext from './taskRefreshContext';

export const TaskRefreshProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <TaskRefreshContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </TaskRefreshContext.Provider>
  );
};
