import { attachmentService } from "@/shared/services/attachmentService";
import type { ChatAttachment } from "@/shared/types/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/services/apiError";
import { aiService } from "@/shared/services/aiService";
import { generateUUID } from "@/shared/utils/id";
import type {
  AgentMode,
  InteractionAnswer,
  InteractionSelection,
} from "@/shared/types/domain";
import { useAgenticChatMutation } from "../api/aiMutations";
import {
  useConversationSession,
  type ConversationSessionOptions,
} from "./useConversationSession";

export type ConversationChatOptions = ConversationSessionOptions;

export function useConversationChat(options?: ConversationChatOptions) {
  const mutation = useAgenticChatMutation();
  const session = useConversationSession(options);
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
    messages,
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
      const result = await mutation.mutateAsync(payload);
      if (!isCurrent()) return;
      receive(result, payload.requestId);
      await load(id);
      return true;
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
        [400, 404, 422].includes(err.status ?? 0)
      )
        setPending(null);
      if (isCurrent())
        setError(
          err instanceof Error
            ? err.message
            : "No response received. Please try again.",
        );
      return Boolean(payload);
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

  const locked = loading || sending || Boolean(error) || Boolean(pending);
  return {
    messages,
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
