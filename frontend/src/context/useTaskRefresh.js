import { useContext } from 'react';
import TaskRefreshContext from './taskRefreshContext';

export const useTaskRefresh = () => {
  const context = useContext(TaskRefreshContext);

  if (!context) {
    throw new Error('useTaskRefresh must be used within TaskRefreshProvider');
  }

  return context;
};
