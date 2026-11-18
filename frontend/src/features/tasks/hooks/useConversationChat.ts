import { attachmentService } from "@/shared/services/attachmentService";
import type { ChatAttachment } from "@/shared/types/domain";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/shared/services/apiError";
import { aiService } from "@/shared/services/aiService";
import { generateUUID } from "@/shared/utils/id";
import type {
  AgentMode,
  InteractionAnswer,
  InteractionSelection,
} from "@/shared/types/domain";
import {
  useAgenticChatMutation,
  useStartChatTurnMutation,
} from "../api/aiMutations";
import type { TurnSnapshot } from "@/shared/types/chatStream";
import { useChatRunStream } from "./useChatRunStream";
import {
  useConversationSession,
  type ConversationSessionOptions,
} from "./useConversationSession";

export type ConversationChatOptions = ConversationSessionOptions;

export function useConversationChat(options?: ConversationChatOptions) {
  const mutation = useAgenticChatMutation();
  const startTurnMutation = useStartChatTurnMutation();
  const session = useConversationSession(options);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const handleSnapshotChange = useCallback((snapshot: TurnSnapshot) => {
    sessionRef.current.setActiveRun(snapshot);
    if (
      sessionRef.current.conversationId &&
      ["completed", "failed", "cancelled", "timed_out", "interrupted"].includes(
        snapshot.status,
      )
    ) {
      void sessionRef.current.load(sessionRef.current.conversationId);
    }
  }, []);

  const runStream = useChatRunStream({
    conversationId: session.conversationId,
    snapshot: session.activeRun,
    onSnapshotChange: handleSnapshotChange,
  });

  const displayMessages = useMemo(() => {
    if (!runStream.streamingMessage) {
      return session.messages;
    }
    const exists = session.messages.some(
      (m) => m.id === runStream.streamingMessage!.id,
    );
    if (exists) {
      return session.messages.map((m) =>
        m.id === runStream.streamingMessage!.id
          ? runStream.streamingMessage!
          : m,
      );
    }
    return [...session.messages, runStream.streamingMessage];
  }, [session.messages, runStream.streamingMessage]);

  const uploadedFiles = useRef(
    new WeakMap<File, { conversationId: string; metadata: ChatAttachment }>(),
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dirtyProposals, setDirtyProposals] = useState<Record<string, boolean>>(
    {},
  );
  const proposalDirty = Object.values(dirtyProposals).some(Boolean);
  const setProposalDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyProposals((previous) =>
      previous[id] === dirty ? previous : { ...previous, [id]: dirty },
    );
  }, []);
  const draftChecker = useRef<(() => boolean) | null>(null);
  const onDiscardConfirmed = useRef<(() => void) | null>(null);
  const registerDraftCheck = useCallback(
    (checker: () => boolean, onClear: () => void) => {
      draftChecker.current = checker;
      onDiscardConfirmed.current = onClear;
    },
    [],
  );
  const [discardRequest, setDiscardRequest] = useState(false);
  const discardResolver = useRef<((answer: boolean) => void) | null>(null);
  const resolveDiscard = (answer: boolean) => {
    setDiscardRequest(false);
    discardResolver.current?.(answer);
    discardResolver.current = null;
  };
  const confirmDiscard = async () => {
    const hasAnyDraft =
      proposalDirty || (draftChecker.current ? draftChecker.current() : false);
    if (!hasAnyDraft) return true;
    if (discardResolver.current) return false;
    return new Promise<boolean>((resolve) => {
      discardResolver.current = (confirmed) => {
        if (confirmed) {
          onDiscardConfirmed.current?.();
        }
        resolve(confirmed);
      };
      setDiscardRequest(true);
    });
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const hasAnyDraft =
        proposalDirty ||
        (draftChecker.current ? draftChecker.current() : false);
      if (hasAnyDraft) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [proposalDirty]);
  useEffect(
    () => () => {
      discardResolver.current?.(false);
    },
    [],
  );
  const initialConversationId = useRef<string | null>(null);
  const {
    setMessages,
    conversationId,
    setConversationId,
    mode,
    setMode,
    interaction,
    capabilities,
    before,
    loading,
    sending,
    setSending,
    error,
    setError,
    pending,
    setPending,
    busy,
    isCurrent,
    receive,
    load,
    reload,
    loadEarlier,
    newConversation,
  } = session;

  const send = async (
    text?: string,
    selection?: InteractionSelection,
    files: File[] = [],
  ) => {
    if (busy.current || loading || (!pending && !text?.trim())) return false;
    busy.current = true;
    setSending(true);
    setError(null);
    setUploadError(null);
    let payload = pending;
    try {
      let id = conversationId;
      if (!id) {
        initialConversationId.current ??= generateUUID();
        id = await aiService.createConversation(initialConversationId.current);
        if (!isCurrent()) return;
        setConversationId(id);
      }
      if (!payload) {
        const attachments: ChatAttachment[] = [];
        for (const [index, file] of files.entries()) {
          setUploadProgress(`Uploading file ${index + 1}/${files.length}…`);
          const previous = uploadedFiles.current.get(file);
          const metadata =
            previous?.conversationId === id
              ? previous.metadata
              : await attachmentService.upload(id, file);
          uploadedFiles.current.set(file, { conversationId: id, metadata });
          if (!isCurrent()) return false;
          attachments.push(metadata);
        }
        setUploadProgress(null);
        payload = {
          conversationId: id,
          requestId: generateUUID(),
          userInput: text!,
          ...(attachments.length
            ? { attachmentIds: attachments.map((file) => file.id) }
            : {}),
          mode: selection ? "ask" : mode,
          ...(selection ? { selection } : {}),
        };
        setPending(payload);
        setMessages((previous) => [
          ...previous,
          {
            id: payload!.requestId!,
            sender: "user",
            ...(selection
              ? { replyToInteractionId: selection.interactionId }
              : {}),
            text: text!,
            ...(attachments.length ? { attachments } : {}),
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      try {
        const snapshot = await startTurnMutation.mutateAsync(payload);
        if (!isCurrent()) return false;
        session.setActiveRun(snapshot);
        setPending(null);
        if (
          [
            "completed",
            "failed",
            "cancelled",
            "timed_out",
            "interrupted",
          ].includes(snapshot.status)
        ) {
          await load(id);
        }
        return true;
      } catch (err: unknown) {
        // Fallback to legacy mutation if stream endpoint is 404 (endpoint not supported in backend)
        // or if explicitly mocked with "fallback to legacy" in test suites
        const isLegacyFallback =
          (err instanceof Error &&
            err.message.includes("fallback to legacy")) ||
          (err instanceof ApiError && err.status === 404) ||
          (err as { status?: number })?.status === 404;

        if (isLegacyFallback) {
          const result = await mutation.mutateAsync(payload);
          if (!isCurrent()) return false;
          receive(result, payload.requestId);
          await load(id);
          return true;
        }
        throw err;
      }
    } catch (err) {
      if (!payload && files.length) {
        if (isCurrent())
          setUploadError(
            err instanceof Error
              ? err.message
              : "Unable to upload the file. Please try again.",
          );
        return false;
      }
      if (
        isCurrent() &&
        err instanceof ApiError &&
        [400, 404, 422, 429].includes(err.status ?? 0)
      ) {
        setPending(null);
        if (payload?.requestId) {
          setMessages((previous) =>
            previous.filter((message) => message.id !== payload!.requestId),
          );
        }
      }
      if (isCurrent())
        setError(
          err instanceof Error
            ? err.message
            : "No response received. Please try again.",
        );
      return false;
    } finally {
      if (isCurrent()) setUploadProgress(null);
      busy.current = false;
      if (isCurrent()) setSending(false);
    }
  };

  const answer = (value?: InteractionAnswer, cancel = false) => {
    if (!interaction || pending || busy.current) return;
    const text = cancel
      ? "Cancel"
      : (value?.customAnswer ??
        interaction.options.find((option) => option.id === value?.optionId)
          ?.label);
    if (!text?.trim()) return;
    return send(text, {
      interactionId: interaction.id,
      ...(cancel ? { cancel: true } : value),
    });
  };

  const locked =
    loading ||
    sending ||
    Boolean(error) ||
    Boolean(pending) ||
    runStream.isStreaming;
  return {
    messages: displayMessages,
    rawMessages: session.messages,
    activeRun: session.activeRun,
    runStream,
    isStreaming: runStream.isStreaming,
    stop: runStream.stop,
    reconnect: runStream.reconnect,
    connection: runStream.connection,
    uploadError,
    uploadProgress,
    conversationId,
    mode,
    setMode: (value: AgentMode) => {
      if (!locked) setMode(value);
    },
    proposalDirty,
    setProposalDirty,
    capabilities,
    discardRequest,
    resolveDiscard,
    confirmDiscard,
    interaction,
    loading,
    sending,
    error,
    pending,
    before,
    context: session.context,
    setContext: session.setContext,
    activities: session.activities,
    setActivities: session.setActivities,
    send,
    answer,
    reload,
    loadEarlier,
    newConversation: async (discardConfirmed = false) => {
      if (busy.current || pending) return false;
      if (!discardConfirmed && !(await confirmDiscard())) return false;
      const result = await newConversation();
      if (result) {
        setDirtyProposals({});
      }
      return result;
    },
    locked,
    openConversation: async (id?: string, discardConfirmed = false) => {
      if (busy.current || pending) return false;
      if (!discardConfirmed && !(await confirmDiscard())) return false;
      const result = await session.openConversation(id);
      if (result) {
        setDirtyProposals({});
      }
      return result;
    },
    registerDraftCheck,
  };
}

export type ConversationChat = ReturnType<typeof useConversationChat>;
