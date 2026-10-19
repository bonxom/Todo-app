import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/services/apiError";
import { aiService } from "@/shared/services/aiService";
import { useAuthStore } from "@/stores/useAuthStore";
import type { AgentMode, AgentInteraction, ChatPayload, ChatResponse, ConversationMessage, InteractionAnswer, InteractionPayload } from "@/shared/types/domain";
import { useAgenticChatMutation, useInteractionMutation } from "../api/aiMutations";

export function useConversationChat() {
  const mutation = useAgenticChatMutation();
  const interactionMutation = useInteractionMutation();
  const sessionRevision = useAuthStore((state) => state.sessionRevision);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [mode, setMode] = useState<AgentMode>("auto");
  const [interaction, setInteraction] = useState<AgentInteraction>();
  const [answerPending, setAnswerPending] = useState<InteractionPayload | null>(null);
  const [before, setBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatPayload | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  const loadVersion = useRef(0);
  const initialConversationId = useRef<string | null>(null);
  const isCurrent = useCallback(() => active.current && useAuthStore.getState().sessionRevision === sessionRevision, [sessionRevision]);

  const load = useCallback(async (id?: string) => {
    const version = ++loadVersion.current;
    const result = await aiService.getConversation(id);
    if (!isCurrent() || version !== loadVersion.current) return;
    setConversationId(result?.conversationId);
    setMessages(result?.messages ?? []);
    setBefore(result?.before ?? null);
    setMode(result?.mode ?? "auto");
    setInteraction(result?.interaction);
    const turn = result?.pending[0];
    setPending(turn ? { ...turn, conversationId: result!.conversationId } : null);
    setAnswerPending((previous) => (result?.interaction?.id === previous?.interactionId || (!result?.interaction && result?.pending.length)) ? previous : null);
  }, [isCurrent]);

  useEffect(() => {
    active.current = true;
    busy.current = true;
    void load().catch(() => {
      if (isCurrent()) setError("Could not load your conversation. Please try again.");
    }).finally(() => { busy.current = false; if (isCurrent()) setLoading(false); });
    return () => { active.current = false; };
  }, [load, isCurrent]);

  const reload = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try { await load(conversationId); if (isCurrent()) setError(null); }
    catch { if (isCurrent()) setError("Could not load your conversation. Please try again."); }
    finally { busy.current = false; if (isCurrent()) setLoading(false); }
  };

  const receive = (result: ChatResponse, requestId?: string) => {
    setInteraction(result.interaction);
    if (result.status !== "processing") setPending(null);
    if (result.data) setMessages((previous) => [...previous.filter((message) => message.id !== `${requestId}:bot`), {
      id: `${requestId}:bot`, sender: "bot", text: result.data, timestamp: new Date().toISOString(),
    }]);
  };

  const send = async (text?: string) => {
    if (busy.current || loading || interaction || answerPending || (!pending && !text?.trim())) return;
    busy.current = true;
    setSending(true);
    setError(null);
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
        payload = { conversationId: id, requestId: crypto.randomUUID(), userInput: text!, mode };
        setPending(payload);
        setMessages((previous) => [...previous, { id: payload!.requestId!, sender: "user", text: text!, timestamp: new Date().toISOString() }]);
      }
      const result = await mutation.mutateAsync(payload);
      if (!isCurrent()) return;
      receive(result, payload.requestId);
      await load(id);
    } catch (err) {
      if (isCurrent() && err instanceof ApiError && [400, 404, 422].includes(err.status ?? 0)) setPending(null);
      if (isCurrent()) setError(err instanceof Error ? err.message : "Could not get the reply. Retry using the same request.");
    } finally {
      busy.current = false;
      if (isCurrent()) setSending(false);
    }
  };

  const answer = async (selection?: InteractionAnswer, cancel = false) => {
    if (busy.current || !conversationId || (!interaction && !answerPending)) return;
    const payload = answerPending ?? { conversationId, interactionId: interaction!.id, requestId: crypto.randomUUID(), ...selection, ...(cancel ? { cancel: true } : {}) };
    busy.current = true;
    setAnswerPending(payload);
    setSending(true);
    setError(null);
    try {
      const result = await interactionMutation.mutateAsync(payload);
      if (!isCurrent()) return;
      receive(result, payload.requestId);
      if (result.status !== "processing") setAnswerPending(null);
      await load(conversationId);
    } catch (err) {
      if (isCurrent() && err instanceof ApiError && [400, 422].includes(err.status ?? 0)) setAnswerPending(null);
      if (isCurrent()) setError(err instanceof Error ? err.message : "Could not submit your answer. Retry using the same request.");
    } finally {
      busy.current = false;
      if (isCurrent()) setSending(false);
    }
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
    } catch { if (isCurrent()) setError("Could not load earlier messages."); }
    finally { busy.current = false; if (isCurrent()) setLoading(false); }
  };

  const locked = loading || sending || Boolean(error) || Boolean(pending) || Boolean(interaction) || Boolean(answerPending);
  return { messages, conversationId, mode, setMode: (value: AgentMode) => { if (!locked) setMode(value); }, interaction, answerPending,
    loading, sending, error, pending, before, send, answer, reload, loadEarlier, locked };
}
