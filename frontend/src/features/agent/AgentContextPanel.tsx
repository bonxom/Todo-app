import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/services/apiError";
import React, { useEffect, useState, useRef } from "react";
import { Folder, AlertCircle } from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";
import { aiService } from "@/shared/services/aiService";
import { projectService } from "@/shared/services/projectService";
import type { Project } from "@/shared/types/domain";
import type { ConversationChat } from "@/features/tasks/hooks/useConversationChat";

interface AgentContextPanelProps {
  chat: ConversationChat;
}

export function AgentContextPanel({ chat }: AgentContextPanelProps) {
  const { t } = useTranslation("agent");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingProjects(true);
    projectService
      .getAllProjects()
      .then((res) => {
        if (active) setProjects(res || []);
      })
      .catch(() => {
        if (active) setProjects([]);
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentIdentity = useRef(chat.conversationId);
  currentIdentity.current = chat.conversationId;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const currentProjectId = chat.context?.projectId || "";
  const isUnavailable = chat.context?.available === false;
  const isPending =
    chat.loading || chat.sending || Boolean(chat.pending) || savingContext;

  const handleProjectChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextProjectId = e.target.value || null;
    const conversationId = chat.conversationId;
    if (!conversationId) return;

    const isCurrent = () =>
      mounted.current && currentIdentity.current === conversationId;
    const previousProjectId = currentProjectId;
    setSavingContext(true);
    setContextError(null);

    // Optimistically update
    chat.setContext?.({ projectId: nextProjectId, available: true });

    try {
      await aiService.updateConversationContext(conversationId, nextProjectId);
    } catch (err: unknown) {
      if (!isCurrent()) return;
      // Revert on error
      chat.setContext?.({
        projectId: previousProjectId || null,
        available: !isUnavailable,
      });
      if (err instanceof ApiError && err.status === 409) {
        setContextError(
          t("conversationIsBusyProcessingCannotChangeProjectContext"),
        );
      } else {
        setContextError(t("unableToUpdateProjectContextPleaseTryAgain"));
      }
    } finally {
      if (mounted.current) setSavingContext(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-[var(--color-accent)]" />
          <label
            htmlFor="agent-context-project-select"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            {t("projectContext")}
          </label>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {t("agentReferencesThisProjectYouCanStillSpecifyOtherProjects")}
        </p>

        <div className="mt-2">
          <CustomSelect
            id="agent-context-project-select"
            aria-label={t("projectContext")}
            disabled={isPending || loadingProjects || !chat.conversationId}
            value={currentProjectId}
            onChange={handleProjectChange}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="">{t("noProjectSelectedDefault")}</option>
            {projects.map((proj) => (
              <option key={proj._id} value={proj._id}>
                {proj.name}
                {proj.status === "completed" ? t("completedSuffix") : ""}
              </option>
            ))}
          </CustomSelect>
        </div>

        {isUnavailable && (
          <div
            role="status"
            className="mt-2 flex items-start gap-1.5 text-xs text-amber-500"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {t("previouslySelectedProjectIsNoLongerAvailableOrWasDeleted")}
            </span>
          </div>
        )}

        {contextError && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-1.5 text-xs text-red-500"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{contextError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
