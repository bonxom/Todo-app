import { useQuery } from "@tanstack/react-query";
import { taskKeys } from "@/features/tasks/api/taskKeys";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";

// Cards, totals, filters and details must all describe the same complete list.
export const useWorkspaceTasksQuery = () =>
  useQuery({
    queryKey: [...taskKeys.lists(), "workspace"],
    queryFn: async ({ signal }): Promise<Task[]> => {
      const tasks: Task[] = [];
      let pageNo = 1;
      let totalPage = 1;
      do {
        const page = await taskService.getAllTasks(
          { pageNo, pageSize: 100 },
          { signal },
        );
        tasks.push(...page.data);
        totalPage = page.pageInfo.totalPage;
        pageNo += 1;
      } while (pageNo <= totalPage);
      return tasks;
    },
  });
