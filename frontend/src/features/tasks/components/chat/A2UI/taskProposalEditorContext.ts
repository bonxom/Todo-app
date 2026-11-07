import { createContext } from "react";
import type { useTaskProposalEditor } from "@/features/tasks/hooks/A2UI/useTaskProposalEditor";

export type TaskProposalEditorState = ReturnType<typeof useTaskProposalEditor>;

export const TaskProposalEditorContext =
  createContext<TaskProposalEditorState | null>(null);
