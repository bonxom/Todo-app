import { useCallback, useEffect, useRef, useState } from "react";
import {
  useBlocker,
  useLocation,
  useNavigationType,
  useSearchParams,
} from "react-router-dom";
import { useAgentSession } from "./agentSessionContext";

export function useAgentNavigation() {
  const { chat, draft, clearDraft } = useAgentSession();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [params, setParams] = useSearchParams();
  const activeConversationId = params.get("conversation") || undefined;
  const assistantHandoff =
    navigationType === "PUSH" && Boolean(location.state?.assistantHandoff);
  const newChatProject = activeConversationId
    ? undefined
    : params.get("project") || undefined;
  const activeProjectId = activeConversationId
    ? (chat.context?.projectId ?? undefined)
    : newChatProject;
  const [resolvedKey, setResolvedKey] = useState<string>();
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const hasDraft = Boolean(
    draft.text.trim() ||
    draft.files.length ||
    Object.keys(draft.proposalDrafts).length ||
    chat.proposalDirty,
  );
  const busy = chat.loading || chat.sending || Boolean(chat.pending);
  const internalNavigation = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (
      internalNavigation.current ||
      nextLocation.pathname !== currentLocation.pathname
    ) {
      return false;
    }
    const restartsBlankChat =
      !activeConversationId && nextLocation.key !== currentLocation.key;
    return (
      (nextLocation.search !== currentLocation.search || restartsBlankChat) &&
      (hasDraft || busy)
    );
  });

  const writeUrl = useCallback(
    (nextParams: Record<string, string>, replace = false) => {
      internalNavigation.current = true;
      setParams(nextParams, { replace });
      internalNavigation.current = false;
    },
    [setParams],
  );

  useEffect(() => {
    if (resolvedKey !== location.key) {
      if (!assistantHandoff && (chat.loading || chat.sending)) return;
      const frame = requestAnimationFrame(() => {
        if (
          activeConversationId &&
          activeConversationId !== chat.conversationId
        ) {
          // A turn left pending in the assistant can be recovered from its URL.
          if (chat.pending) {
            chat.resetConversation();
            return;
          }
          clearDraft("new");
          void chat.openConversation(activeConversationId, true);
        } else if (!activeConversationId && !assistantHandoff) {
          clearDraft("new");
          chat.resetConversation(newChatProject);
        }
        setResolvedKey(location.key);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (
      !activeConversationId &&
      chat.conversationId &&
      chat.messages.length &&
      !chat.loading &&
      !chat.sending
    ) {
      writeUrl({ conversation: chat.conversationId }, assistantHandoff);
    }
  }, [
    activeConversationId,
    assistantHandoff,
    chat,
    clearDraft,
    location.key,
    newChatProject,
    resolvedKey,
    writeUrl,
  ]);

  useEffect(() => {
    if (blocker.state === "blocked" && busy) blocker.reset();
  }, [blocker, busy]);

  const perform = (action: () => void) => {
    if (busy) return;
    if (hasDraft) setPendingAction(() => action);
    else action();
  };

  const selectConversation = (targetId: string) => {
    if (targetId === activeConversationId) return;
    perform(() => writeUrl({ conversation: targetId }));
  };

  const startNewChat = (projectId: string | null = activeProjectId ?? null) =>
    perform(() => {
      const sameScope =
        !activeConversationId && (projectId ?? undefined) === newChatProject;
      writeUrl(projectId ? { project: projectId } : {}, sameScope);
    });

  const confirmDiscard = () => {
    clearDraft();
    const action = pendingAction;
    setPendingAction(null);
    if (blocker.state === "blocked") blocker.proceed();
    else action?.();
  };

  const cancelDiscard = () => {
    setPendingAction(null);
    if (blocker.state === "blocked") blocker.reset();
  };

  return {
    activeConversationId,
    activeProjectId,
    resolving:
      !assistantHandoff &&
      resolvedKey !== location.key &&
      (!activeConversationId || activeConversationId !== chat.conversationId),
    selectConversation,
    startNewChat,
    discardPromptOpen:
      Boolean(pendingAction) || (blocker.state === "blocked" && !busy),
    confirmDiscard,
    cancelDiscard,
    blocker,
  };
}
