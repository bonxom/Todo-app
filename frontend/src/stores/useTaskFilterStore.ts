import { useMemo } from "react";
import { create } from "zustand";
import type { Task, TaskStatus } from "../shared/types/domain";

export interface TaskFilterState {
  selectedStatuses: TaskStatus[];
  setSelectedStatuses: (selectedStatuses: TaskStatus[]) => void;
}

export const filterTasks = (
  tasks: Task[] | null | undefined,
  selectedStatuses: TaskStatus[]
): Task[] => {
  const taskList = Array.isArray(tasks) ? tasks : [];

  if (selectedStatuses.length === 0) {
    return taskList;
  }

  return taskList.filter((task) => selectedStatuses.includes(task.status));
};

export const useTaskFilterStore = create<TaskFilterState>((set) => ({
  selectedStatuses: [],
  setSelectedStatuses: (selectedStatuses) => set({ selectedStatuses }),
}));

export const useVisibleTasks = <T extends Task>(tasks: T[] | null | undefined): T[] => {
  const selectedStatuses = useTaskFilterStore((state) => state.selectedStatuses);
  return useMemo(() => filterTasks(tasks, selectedStatuses) as T[], [tasks, selectedStatuses]);
};

export const useTaskFilter = () => {
  const selectedStatuses = useTaskFilterStore((state) => state.selectedStatuses);
  const setSelectedStatuses = useTaskFilterStore((state) => state.setSelectedStatuses);
  return { selectedStatuses, setSelectedStatuses };
};
