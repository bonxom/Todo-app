import { useMemo } from "react";
import { create } from "zustand";
import type { Task } from "../shared/types/domain";

export interface TaskFilterState {
  onlyInProgress: boolean;
  setOnlyInProgress: (onlyInProgress: boolean) => void;
  toggleOnlyInProgress: () => void;
}

export const filterTasks = (tasks: Task[] | null | undefined, onlyInProgress: boolean): Task[] => {
  const taskList = Array.isArray(tasks) ? tasks : [];
  if (!onlyInProgress) {
    return taskList;
  }
  return taskList.filter((task) => task?.status === "in-progress");
};

export const useTaskFilterStore = create<TaskFilterState>((set) => ({
  onlyInProgress: false,
  setOnlyInProgress: (onlyInProgress) => set({ onlyInProgress }),
  toggleOnlyInProgress: () => set((state) => ({ onlyInProgress: !state.onlyInProgress })),
}));

export const useVisibleTasks = <T extends Task>(tasks: T[] | null | undefined): T[] => {
  const onlyInProgress = useTaskFilterStore((state) => state.onlyInProgress);
  return useMemo(() => filterTasks(tasks, onlyInProgress) as T[], [tasks, onlyInProgress]);
};

export const useTaskFilter = () => {
  const onlyInProgress = useTaskFilterStore((state) => state.onlyInProgress);
  const setOnlyInProgress = useTaskFilterStore((state) => state.setOnlyInProgress);
  const toggleOnlyInProgress = useTaskFilterStore((state) => state.toggleOnlyInProgress);
  return { onlyInProgress, setOnlyInProgress, toggleOnlyInProgress };
};
