import { useQueryClient } from '@tanstack/react-query';
import { invalidateWorkspaceQueries } from '../features/tasks/api/invalidation';

export const useTaskRefresh = () => {
  const queryClient = useQueryClient();
  return {
    refreshTrigger: 0,
    triggerRefresh: () => invalidateWorkspaceQueries(queryClient),
  };
};
