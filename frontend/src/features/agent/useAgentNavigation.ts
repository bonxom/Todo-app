import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useBlocker } from "react-router-dom";
import { useAgentSession } from "./agentSessionContext";

export function useAgentNavigation() {
  const { chat, draft, clearDraft } = useAgentSession();
  const [params, setParams] = useSearchParams();
  const activeConversationId = params.get("conversation") || undefined;
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const hasDraft = Boolean(
    draft.text.trim() ||
    draft.files.length ||
    Object.keys(draft.proposalDrafts).length ||
    chat.proposalDirty,
  );
  const busy = chat.loading || chat.sending || Boolean(chat.pending);
  const internalNavigation = useRef(false);
  const writeUrl = useCallback(
    (id: string, replace = false) => {
      internalNavigation.current = true;
      setParams({ conversation: id }, { replace });
      internalNavigation.current = false;
    },
    [setParams],
  );
  const blocker = useBlocker(({ nextLocation }) => {
    // Moving to another surface preserves the same session and all drafts.
    if (internalNavigation.current || nextLocation.pathname !== "/agent")
      return false;
    const nextId =
      new URLSearchParams(nextLocation.search).get("conversation") || undefined;
    return nextId !== activeConversationId && (hasDraft || busy);
  });
  const requested = useRef<string | null>(null);
  const creating = useRef<{ previousId?: string } | null>(null);
  useEffect(() => {
    if (busy) return;
    if (creating.current) {
      if (
        chat.conversationId &&
        chat.conversationId !== creating.current.previousId
      ) {
        requested.current = chat.conversationId;
        writeUrl(chat.conversationId);
        creating.current = null;
      }
      return;
    }
    if (activeConversationId) {
      if (activeConversationId === chat.conversationId) {
        requested.current = activeConversationId;
      } else if (requested.current !== activeConversationId) {
        requested.current = activeConversationId;
        void chat.openConversation(activeConversationId, true);
      }
    } else if (chat.conversationId && !chat.error) {
      writeUrl(chat.conversationId, true);
    }
  }, [activeConversationId, chat, busy, writeUrl]);
  // Never switch away while an execution result is still pending.
  useEffect(() => {
    if (blocker.state === "blocked" && busy) blocker.reset();
  }, [blocker, busy]);
  const perform = (action: () => Promise<void>) => {
    if (busy) return;
    if (hasDraft) setPendingAction(() => () => void action());
    else void action();
  };
  const selectConversation = (targetId: string) => {
    if (targetId === chat.conversationId) return;
    perform(async () => {
      requested.current = null;
      writeUrl(targetId);
    });
  };
  const startNewChat = () =>
    perform(async () => {
      creating.current = { previousId: chat.conversationId };
      if (!(await chat.newConversation(true))) creating.current = null;
    });
  const confirmDiscard = () => {
    clearDraft();
    const action = pendingAction;
    setPendingAction(null);
    if (blocker.state === "blocked") {
      requested.current = null;
      blocker.proceed();
    } else action?.();
  };
  const cancelDiscard = () => {
    setPendingAction(null);
    if (blocker.state === "blocked") blocker.reset();
  };
  return {
    activeConversationId,
    selectConversation,
    startNewChat,
    discardPromptOpen:
      Boolean(pendingAction) || (blocker.state === "blocked" && !busy),
    confirmDiscard,
    cancelDiscard,
    blocker,
  };
}
