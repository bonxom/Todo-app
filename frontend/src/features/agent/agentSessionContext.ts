import type {
  ProposalAction,
  ProposalEnvelope,
} from "@/shared/types/A2UI/taskProposal";
import { createContext, useContext } from "react";
import type { ConversationChat } from "@/features/tasks/hooks/useConversationChat";

export type AgentDraft = {
  text: string;
  files: File[];
  proposalDrafts: Record<string, unknown>;
};

export type AgentSessionOptions = {
  initialConversationId?: string;
  skipInitialLoad?: boolean;
};

export type ProposalSessionState = {
  saved?: ProposalEnvelope;
  pendingAction: ProposalAction | null;
  dirty: boolean;
};

export interface AgentSessionContextValue {
  proposalSessions: Map<string, ProposalSessionState>;
  chat: ConversationChat;
  draft: AgentDraft;
  setDraft: (
    updater: AgentDraft | ((previous: AgentDraft) => AgentDraft),
  ) => void;
  setProposalDraft: (proposalId: string, draft: unknown) => void;
  clearDraft: (conversationId?: string) => void;
}

export const AgentSessionContext =
  createContext<AgentSessionContextValue | null>(null);

export function useAgentSession(): AgentSessionContextValue {
  const context = useContext(AgentSessionContext);
  if (!context)
    throw new Error(
      "useAgentSession must be used within an AgentSessionProvider",
    );
  return context;
}
