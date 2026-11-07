import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import { useContext, useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ProposalAction,
  ProposalEnvelope,
} from "@/shared/types/A2UI/taskProposal";
import { aiService } from "@/shared/services/aiService";
import { ApiError, getApiErrorMessage } from "@/shared/services/apiError";
import { useAuthStore } from "@/stores/useAuthStore";
import { invalidateWorkspaceQueries } from "../../api/invalidation";
export interface UseTaskProposalOptions {
  conversationId: string;
  initialEnvelope: ProposalEnvelope;
  onSuccess?: (envelope: ProposalEnvelope) => void;
}
export function useTaskProposal({
  conversationId,
  initialEnvelope,
  onSuccess,
}: UseTaskProposalOptions) {
  const queryClient = useQueryClient();
  const agentSession = useContext(AgentSessionContext);
  const sessions = agentSession?.proposalSessions;
  const proposalKey = initialEnvelope.proposal.id;
  const [saved, setSaved] = useState<ProposalEnvelope | undefined>(
    () => sessions?.get(proposalKey)?.saved,
  );
  const [dirty, setDirty] = useState(
    () => sessions?.get(proposalKey)?.dirty ?? false,
  );
  const [pendingAction, setPendingAction] = useState<ProposalAction | null>(
    () => sessions?.get(proposalKey)?.pendingAction ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const pending = useRef<ProposalAction | null>(pendingAction);
  const busy = useRef(false);
  const active = useRef(true);
  const sessionRevision = useAuthStore((state) => state.sessionRevision);
  const identity = `${sessionRevision}:${conversationId}:${initialEnvelope.proposal.id}`;
  const currentIdentity = useRef(identity);
  useEffect(() => {
    currentIdentity.current = identity;
    active.current = true;
    return () => {
      active.current = false;
    };
  }, [identity]);
  useEffect(() => {
    sessions?.set(proposalKey, { saved, dirty, pendingAction });
  }, [sessions, proposalKey, saved, dirty, pendingAction]);
  const baseline = useRef(saved ?? initialEnvelope);
  // Preserve dirty/uncertain drafts across unrelated history refreshes.
  useEffect(() => {
    if (
      !dirty &&
      !pendingAction &&
      initialEnvelope.proposal.revision > baseline.current.proposal.revision
    ) {
      baseline.current = initialEnvelope;
      setSaved(initialEnvelope);
    }
  }, [initialEnvelope, dirty, pendingAction]);
  const envelope = saved ?? baseline.current;
  const submit = useCallback(
    async (incoming: ProposalAction): Promise<ProposalEnvelope> => {
      if (busy.current) throw new Error("Đang xử lý yêu cầu.");
      busy.current = true;
      const isCurrent = () =>
        active.current &&
        currentIdentity.current === identity &&
        useAuthStore.getState().sessionRevision === sessionRevision;
      const action = pending.current ?? structuredClone(incoming);
      pending.current = action;
      setPendingAction(action);
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await aiService.applyProposalAction(
          conversationId,
          initialEnvelope.proposal.id,
          action,
        );
        if (!isCurrent()) return result;
        baseline.current = result;
        setSaved(result);
        setDirty(false);
        setPendingAction(null);
        pending.current = null;
        setConflict(false);
        onSuccess?.(result);
        if (action.action === "confirm")
          await invalidateWorkspaceQueries(queryClient).catch(() => undefined);
        return result;
      } catch (failure) {
        if (isCurrent()) {
          const status =
            failure instanceof ApiError ? failure.status : undefined;
          setError(getApiErrorMessage(failure, "Không thể thực hiện yêu cầu."));
          if (status && status >= 400 && status < 500) {
            pending.current = null;
            setPendingAction(null);
            setConflict(status === 409);
          }
          if (action.action === "confirm")
            await invalidateWorkspaceQueries(queryClient).catch(
              () => undefined,
            );
        }
        throw failure;
      } finally {
        busy.current = false;
        if (isCurrent()) setIsSubmitting(false);
      }
    },
    [
      conversationId,
      initialEnvelope.proposal.id,
      identity,
      sessionRevision,
      onSuccess,
      queryClient,
    ],
  );
  const reload = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const isCurrent = () =>
      active.current &&
      currentIdentity.current === identity &&
      useAuthStore.getState().sessionRevision === sessionRevision;
    setIsSubmitting(true);
    try {
      // Search paginated history so older proposal cards can reload too.
      let before: number | undefined;
      do {
        const snapshot = await aiService.getConversation(
          conversationId,
          before,
        );
        if (
          !active.current ||
          currentIdentity.current !== identity ||
          useAuthStore.getState().sessionRevision !== sessionRevision
        )
          return;
        const message = snapshot?.messages.find(
          (message) => message.proposal?.id === initialEnvelope.proposal.id,
        );
        if (message?.proposal) {
          const result: ProposalEnvelope = {
            proposal: message.proposal,
            text: message.text,
            a2ui: message.a2ui,
            surface: message.surface,
          };
          baseline.current = result;
          setSaved(result);
          setDirty(false);
          setError(null);
          setConflict(false);
          pending.current = null;
          setPendingAction(null);
          onSuccess?.(result);
          return;
        }
        before = snapshot?.before ?? undefined;
      } while (before !== undefined);
      setError("Không tìm thấy đề xuất.");
    } catch (failure) {
      if (isCurrent()) setError(getApiErrorMessage(failure));
    } finally {
      busy.current = false;
      if (isCurrent()) setIsSubmitting(false);
    }
  }, [
    conversationId,
    initialEnvelope.proposal.id,
    identity,
    sessionRevision,
    onSuccess,
  ]);
  return {
    envelope,
    dirty,
    setDirty,
    pendingAction,
    isSubmitting,
    error,
    conflict,
    submit,
    reload,
  };
}
