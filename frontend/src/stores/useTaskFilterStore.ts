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
