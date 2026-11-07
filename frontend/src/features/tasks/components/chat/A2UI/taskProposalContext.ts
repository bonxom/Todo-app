import { createContext } from "react";
import type { ProposalView } from "@/shared/types/A2UI/taskProposal";
export const TaskProposalContext = createContext<{
  baseline: ProposalView;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenTask?: (id: string) => void;
  proposalDraft?: ProposalView;
  onProposalDraftChange?: (draft: ProposalView) => void;
  awaitPendingAction?: () => Promise<unknown>;
} | null>(null);
