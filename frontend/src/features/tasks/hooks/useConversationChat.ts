import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/services/apiError";
import { aiService } from "@/shared/services/aiService";
import type { ChatPayload, ConversationMessage } from "@/shared/types/domain";
import { useAgenticChatMutation } from "../api/aiMutations";

export function useConversationChat() {
  const mutation = useAgenticChatMutation();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [before, setBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatPayload | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  const loadVersion = useRef(0);
  const initialConversationId = useRef<string | null>(null);

  const load = useCallback(async (id: string) => {
    const version = ++loadVersion.current;
    const result = await aiService.getConversation(id);
    if (!active.current || version !== loadVersion.current) return;
    setConversationId(result?.conversationId);
    setMessages(result?.messages ?? []);
    setBefore(result?.before ?? null);
    const turn = result?.pending[0];
    setPending(turn ? { ...turn, conversationId: result!.conversationId } : null);
  }, []);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const reload = async () => {
    if (busy.current) return;
    if (!conversationId) { setError(null); return; }
    busy.current = true;
    setLoading(true);
    try { await load(conversationId); if (active.current) setError(null); }
    catch { if (active.current) setError("Could not load your conversation. Please try again."); }
    finally { busy.current = false; if (active.current) setLoading(false); }
  };

  const send = async (text?: string) => {
    if (busy.current || loading) return;
    busy.current = true;
    setSending(true);
    setError(null);
    let payload = pending;
    try {
      let id = conversationId;
      if (!id) {
        initialConversationId.current ??= crypto.randomUUID();
        id = await aiService.createConversation(initialConversationId.current);
        if (!active.current) return;
        setConversationId(id);
      }
      if (!payload) {
        payload = { conversationId: id, requestId: crypto.randomUUID(), userInput: text! };
        setPending(payload);
        setMessages((previous) => [...previous, { id: payload!.requestId!, sender: "user", text: text!, timestamp: new Date().toISOString() }]);
      }
      const result = await mutation.mutateAsync(payload);
      if (!active.current) return;
      // Render the reply even if refreshing the saved history subsequently fails.
      setMessages((previous) => [...previous.filter((message) => message.id !== `${payload!.requestId}:bot`), { id: `${payload!.requestId}:bot`, sender: "bot", text: result.data, timestamp: new Date().toISOString() }]);
      await load(id);
      if (active.current) setError(null);
    } catch (err) {
      if (active.current && err instanceof ApiError && [400, 404, 422].includes(err.status ?? 0)) {
        // Validation/ownership failures never started a turn; allow reload and correction.
        setPending(null);
      }
      if (active.current) setError(err instanceof Error ? err.message : "Could not get the reply. Check again using the same request.");
      // Keep the same request ID for a retry, including an HTTP timeout after a tool committed.
    } finally {
      busy.current = false;
      if (active.current) setSending(false);
    }
  };

  const loadEarlier = async () => {
    if (!before || !conversationId || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const result = await aiService.getConversation(conversationId, before);
      if (active.current && result) {
        setMessages((previous) => [...result.messages, ...previous]);
        setBefore(result.before);
      }
    } catch { if (active.current) setError("Could not load earlier messages."); }
    finally { busy.current = false; if (active.current) setLoading(false); }
  };

  return { messages, conversationId, loading, sending, error, pending, before, send, reload, loadEarlier };
}
