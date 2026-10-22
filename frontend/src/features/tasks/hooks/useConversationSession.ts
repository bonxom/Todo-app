import { useCallback, useEffect, useRef, useState } from "react";
import { aiService } from "@/shared/services/aiService";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
  AgentMode,
  AgentInteraction,
  ChatPayload,
  ChatResponse,
  ConversationMessage,
} from "@/shared/types/domain";

// Owns the current conversation snapshot and guards asynchronous session updates.
export function useConversationSession() {
  const sessionRevision = useAuthStore((state) => state.sessionRevision);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [mode, setMode] = useState<AgentMode>("auto");
  const [interaction, setInteraction] = useState<AgentInteraction>();
  const [before, setBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatPayload | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  const loadVersion = useRef(0);
  const isCurrent = useCallback(
    () =>
      active.current &&
      useAuthStore.getState().sessionRevision === sessionRevision,
    [sessionRevision],
  );

  const load = useCallback(
    async (id?: string) => {
      const version = ++loadVersion.current;
      const result = await aiService.getConversation(id);
      if (!isCurrent() || version !== loadVersion.current) return;
      setConversationId(result?.conversationId);
      setMessages(result?.messages ?? []);
      setBefore(result?.before ?? null);
      setMode(result?.mode ?? "auto");
      setInteraction(result?.interaction);
      const turn = result?.pending[0];
      setPending(
        turn ? { ...turn, conversationId: result!.conversationId } : null,
      );
    },
    [isCurrent],
  );

  useEffect(() => {
    active.current = true;
    busy.current = true;
    void load()
      .catch(() => {
        if (isCurrent())
          setError("Could not load your conversation. Please try again.");
      })
      .finally(() => {
        busy.current = false;
        if (isCurrent()) setLoading(false);
      });
    return () => {
      active.current = false;
    };
  }, [load, isCurrent]);

  const openConversation = async (id?: string) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await load(id);
      if (isCurrent()) setError(null);
    } catch {
      if (isCurrent())
        setError("Could not load your conversation. Please try again.");
    } finally {
      busy.current = false;
      if (isCurrent()) setLoading(false);
    }
  };

  const reload = () => openConversation(conversationId);

  const newConversation = async () => {
    if (busy.current) return false;
    busy.current = true;
    setLoading(true);
    try {
      const id = await aiService.createConversation(crypto.randomUUID());
      if (!isCurrent()) return false;
      setConversationId(id);
      setMessages([]);
      setInteraction(undefined);
      setBefore(null);
      setPending(null);
      setError(null);
      setMode("auto");
      return true;
    } catch {
      if (isCurrent()) setError("Could not create a new conversation. Please try again.");
      return false;
    } finally {
      busy.current = false;
      if (isCurrent()) setLoading(false);
    }
  };

  const receive = (result: ChatResponse, requestId?: string) => {
    setInteraction(result.interaction);
    if (result.status !== "processing") setPending(null);
    if (result.data && !result.interaction)
      setMessages((previous) => [
        ...previous.filter((message) => message.id !== `${requestId}:bot`),
        {
          id: `${requestId}:bot`,
          sender: "bot",
          text: result.data,
          timestamp: new Date().toISOString(),
        },
      ]);
  };

  const loadEarlier = async () => {
    if (!before || !conversationId || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const result = await aiService.getConversation(conversationId, before);
      if (isCurrent() && result) {
        setMessages((previous) => [...result.messages, ...previous]);
        setBefore(result.before);
      }
    } catch {
      if (isCurrent()) setError("Could not load earlier messages.");
    } finally {
      busy.current = false;
      if (isCurrent()) setLoading(false);
    }
  };

  return {
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
    load,
    receive,
    reload,
    openConversation,
    loadEarlier,
    newConversation,
  };
}

export type ConversationSession = ReturnType<typeof useConversationSession>;
