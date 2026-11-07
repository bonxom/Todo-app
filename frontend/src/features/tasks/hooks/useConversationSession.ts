import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/services/apiError";
import { aiService } from "@/shared/services/aiService";
import { generateUUID } from "@/shared/utils/id";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
  AgentMode,
  AgentInteraction,
  AgentActivity,
  ChatPayload,
  ChatResponse,
  ConversationMessage,
} from "@/shared/types/domain";

export type ConversationSessionOptions = {
  initialConversationId?: string;
  skipInitialLoad?: boolean;
};

// Owns the current conversation snapshot and guards asynchronous session updates.
export function useConversationSession(options?: ConversationSessionOptions) {
  const sessionRevision = useAuthStore((state) => state.sessionRevision);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    options?.initialConversationId,
  );
  const [mode, setMode] = useState<AgentMode>("auto");
  const [interaction, setInteraction] = useState<AgentInteraction>();
  const [before, setBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(!options?.skipInitialLoad);
  const [sending, setSending] = useState(false);
  const [capabilities, setCapabilities] = useState<{
    taskProposals?: boolean;
    uiComposition?: boolean;
  }>({
    taskProposals: false,
    uiComposition: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatPayload | null>(null);
  const [context, setContext] = useState<
    { projectId: string | null; available: boolean } | undefined
  >();
  const [activities, setActivities] = useState<AgentActivity[]>([]);
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
      const [result, caps] = await Promise.all([
        aiService.getConversation(id),
        aiService
          .getConversationCapabilities()
          .catch(() => ({ taskProposals: false })),
      ]);
      if (!isCurrent() || version !== loadVersion.current) return;
      if (caps) setCapabilities(caps);
      setConversationId(result?.conversationId);
      setMessages(result?.messages ?? []);
      setBefore(result?.before ?? null);
      setMode(result?.mode ?? "auto");
      setInteraction(result?.interaction);
      setContext(result?.context);
      setActivities(result?.activities ?? []);
      const turn = result?.pending[0];
      setPending(
        turn ? { ...turn, conversationId: result!.conversationId } : null,
      );
    },
    [isCurrent],
  );

  const lastRevision = useRef(sessionRevision);
  useEffect(() => {
    if (lastRevision.current !== sessionRevision) {
      lastRevision.current = sessionRevision;
      setMessages([]);
      setConversationId(undefined);
      setInteraction(undefined);
      setPending(null);
      setError(null);
      setContext(undefined);
      setActivities([]);
      setBefore(null);
      busy.current = true;
      setLoading(true);
      void load()
        .catch(() => {
          if (isCurrent())
            setError("Unable to load the conversation. Please try again.");
        })
        .finally(() => {
          busy.current = false;
          if (isCurrent()) setLoading(false);
        });
    }
  }, [sessionRevision, load, isCurrent]);

  useEffect(() => {
    active.current = true;
    if (options?.skipInitialLoad) {
      setLoading(false);
      return () => {
        active.current = false;
      };
    }
    busy.current = true;
    void load(options?.initialConversationId)
      .catch((err: unknown) => {
        if (isCurrent()) {
          const isNotFound =
            err instanceof ApiError && [400, 404].includes(err.status ?? 0);
          setError(
            isNotFound
              ? "Hội thoại không khả dụng hoặc đã bị xóa."
              : "Unable to load the conversation. Please try again.",
          );
        }
      })
      .finally(() => {
        busy.current = false;
        if (isCurrent()) setLoading(false);
      });
    return () => {
      active.current = false;
    };
  }, [
    load,
    isCurrent,
    options?.initialConversationId,
    options?.skipInitialLoad,
  ]);

  const openConversation = async (id?: string) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await load(id);
      if (isCurrent()) setError(null);
      return isCurrent();
    } catch (err: unknown) {
      if (isCurrent()) {
        const isNotFound =
          err instanceof ApiError && [400, 404].includes(err.status ?? 0);
        setError(
          isNotFound
            ? "Hội thoại không khả dụng hoặc đã bị xóa."
            : "Unable to load the conversation. Please try again.",
        );
      }
      return false;
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
      const id = await aiService.createConversation(generateUUID());
      if (!isCurrent()) return false;
      setConversationId(id);
      setMessages([]);
      setInteraction(undefined);
      setContext(undefined);
      setActivities([]);
      setBefore(null);
      setPending(null);
      setError(null);
      return true;
    } catch {
      if (isCurrent())
        setError("Unable to create a conversation. Please try again.");
      return false;
    } finally {
      busy.current = false;
      if (isCurrent()) setLoading(false);
    }
  };

  const receive = (result: ChatResponse, requestId?: string) => {
    setInteraction(result.interaction);
    if (result.status !== "processing") setPending(null);
    if (result.activities && result.activities.length > 0) {
      setActivities((previous) => {
        const existingIds = new Set(previous.map((a) => a.id));
        const newOnes = result.activities!.filter(
          (a) => !existingIds.has(a.id),
        );
        return [...previous, ...newOnes];
      });
    }
    if (result.data || result.interaction)
      setMessages((previous) => [
        ...previous.filter((message) => message.id !== `${requestId}:bot`),
        {
          id: `${requestId}:bot`,
          sender: "bot",
          skillsRead: result.skillsRead ?? [],
          text: result.interaction?.question ?? result.data,
          interaction: result.interaction,
          proposal: result.proposal,
          a2ui: result.a2ui,
          surface: result.surface,
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
        if (result.activities && result.activities.length > 0) {
          setActivities((previous) => {
            const existingIds = new Set(previous.map((a) => a.id));
            const newOnes = result.activities!.filter(
              (a) => !existingIds.has(a.id),
            );
            return [...newOnes, ...previous];
          });
        }
      }
    } catch {
      if (isCurrent()) setError("Unable to load earlier messages.");
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
    load,
    receive,
    reload,
    openConversation,
    context,
    setContext,
    activities,
    setActivities,
    loadEarlier,
    newConversation,
  };
}

export type ConversationSession = ReturnType<typeof useConversationSession>;
