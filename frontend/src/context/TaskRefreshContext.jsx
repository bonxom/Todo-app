import { createContext, useContext, useState, useCallback } from 'react';

const TaskRefreshContext = createContext();

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

export const useTaskRefresh = () => {
  const context = useContext(TaskRefreshContext);
  if (!context) {
    throw new Error('useTaskRefresh must be used within TaskRefreshProvider');
  }
  return context;
};
