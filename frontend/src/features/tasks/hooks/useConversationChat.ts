import { attachmentService } from "@/shared/services/attachmentService";
import type { ChatAttachment } from "@/shared/types/domain";
import { useRef, useState } from "react";
import { ApiError } from "@/shared/services/apiError";
import { aiService } from "@/shared/services/aiService";
import type {
  AgentMode,
  InteractionAnswer,
  InteractionSelection,
} from "@/shared/types/domain";
import { useAgenticChatMutation } from "../api/aiMutations";
import { useConversationSession } from "./useConversationSession";

// Public chat hook: composes session recovery, message sending, and human answers.
export function useConversationChat() {
  const mutation = useAgenticChatMutation();
  const session = useConversationSession();
  const uploadedFiles = useRef(
    new WeakMap<File, { conversationId: string; metadata: ChatAttachment }>(),
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const initialConversationId = useRef<string | null>(null);
  const {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    mode,
    setMode,
    interaction,
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
        initialConversationId.current ??= crypto.randomUUID();
        id = await aiService.createConversation(initialConversationId.current);
        if (!isCurrent()) return;
        setConversationId(id);
      }
      if (!payload) {
        const attachments: ChatAttachment[] = [];
        for (const [index, file] of files.entries()) {
          setUploadProgress(`Uploading ${index + 1} of ${files.length}…`);
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
          requestId: crypto.randomUUID(),
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
              : "Upload failed. Please try again.",
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
            : "Could not get the reply. Retry using the same request.",
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
      ? "Hủy"
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
    interaction,
    loading,
    sending,
    error,
    pending,
    before,
    send,
    answer,
    reload,
    loadEarlier,
    newConversation,
    locked,
    openConversation: session.openConversation,
  };
}
