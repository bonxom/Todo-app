import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInRouterContext, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useConversationChat } from "@/features/tasks/hooks/useConversationChat";
import {
  AgentSessionContext,
  type ProposalSessionState,
  type AgentDraft,
  type AgentSessionOptions,
  type AgentSessionContextValue,
} from "./agentSessionContext";

export {
  AgentSessionContext,
  type AgentDraft,
  type AgentSessionOptions,
  type AgentSessionContextValue,
};

const defaultDraft: AgentDraft = {
  text: "",
  files: [],
  proposalDrafts: {},
};

export interface AgentSessionProviderProps extends AgentSessionOptions {
  children: React.ReactNode;
}

function RoutedSession(props: AgentSessionProviderProps) {
  const location = useLocation();
  const fromUrl =
    location.pathname === "/agent"
      ? new URLSearchParams(location.search).get("conversation") || undefined
      : undefined;
  return (
    <SessionState
      {...props}
      initialConversationId={props.initialConversationId ?? fromUrl}
    />
  );
}

export function AgentSessionProvider(props: AgentSessionProviderProps) {
  const inRouter = useInRouterContext();
  const revision = useAuthStore((state) => state.sessionRevision);
  return inRouter ? (
    <RoutedSession key={revision} {...props} />
  ) : (
    <SessionState key={revision} {...props} />
  );
}

function SessionState({
  children,
  initialConversationId,
  skipInitialLoad,
}: AgentSessionProviderProps) {
  // Initial location is captured once; subsequent navigation is handled explicitly.
  const [initialOptions] = useState(() => ({
    initialConversationId,
    skipInitialLoad,
  }));
  const [drafts, setDrafts] = useState<Record<string, AgentDraft>>({});

  const chat = useConversationChat(initialOptions);
  const [proposalSessions] = useState(
    () => new Map<string, ProposalSessionState>(),
  );

  const conversationKey = chat.conversationId || "new";
  const draft = drafts[conversationKey] || defaultDraft;
  const activeDraftKey = useRef(conversationKey);
  useEffect(() => {
    activeDraftKey.current = conversationKey;
  }, [conversationKey]);

  // Associate the unsaved composer state before rendering the new conversation.
  // This conditional state adjustment prevents a blank intermediate composer.
  if (chat.conversationId && drafts.new) {
    const migrated = {
      ...drafts,
      [chat.conversationId]: drafts[chat.conversationId] ?? drafts.new,
    };
    delete migrated.new;
    setDrafts(migrated);
  }

  const setDraft = useCallback(
    (updater: AgentDraft | ((previous: AgentDraft) => AgentDraft)) => {
      setDrafts((prev) => {
        const key = chat.conversationId || activeDraftKey.current;
        const currentDraft = prev[key] || defaultDraft;
        const next =
          typeof updater === "function" ? updater(currentDraft) : updater;
        return {
          ...prev,
          [key]: next,
        };
      });
    },
    [chat.conversationId],
  );

  const setProposalDraft = useCallback(
    (proposalId: string, proposalDraft: unknown) => {
      setDrafts((prev) => {
        const key = chat.conversationId || "new";
        const currentDraft = prev[key] || defaultDraft;
        const nextProposalDrafts = { ...currentDraft.proposalDrafts };
        if (proposalDraft === null || proposalDraft === undefined) {
          delete nextProposalDrafts[proposalId];
        } else {
          nextProposalDrafts[proposalId] = proposalDraft;
        }
        return {
          ...prev,
          [key]: {
            ...currentDraft,
            proposalDrafts: nextProposalDrafts,
          },
        };
      });
    },
    [chat.conversationId],
  );

  const clearDraft = useCallback(
    (targetConversationId?: string) => {
      const key = targetConversationId || chat.conversationId || "new";
      setDrafts((prev) => {
        if (!prev[key]) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    },
    [chat.conversationId],
  );

  const hasDraft =
    Boolean(draft.text.trim()) ||
    draft.files.length > 0 ||
    Object.keys(draft.proposalDrafts).length > 0 ||
    chat.proposalDirty;

  useEffect(() => {
    if (!hasDraft) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDraft]);

  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    chat.registerDraftCheck?.(
      () => {
        const key = chat.conversationId || "new";
        const current = draftsRef.current[key];
        return Boolean(
          (current &&
            (Boolean(current.text.trim()) ||
              current.files.length > 0 ||
              Object.keys(current.proposalDrafts).length > 0)) ||
          chat.proposalDirty,
        );
      },
      () => {
        clearDraft();
      },
    );
  }, [chat, clearDraft]);

  const value = useMemo(
    () => ({
      chat,
      draft,
      setDraft,
      setProposalDraft,
      clearDraft,
      proposalSessions,
    }),
    [chat, draft, setDraft, setProposalDraft, clearDraft, proposalSessions],
  );

  return (
    <AgentSessionContext.Provider value={value}>
      {children}
    </AgentSessionContext.Provider>
  );
}
