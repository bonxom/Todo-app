import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { taskService } from "@/shared/services/taskService";
import TaskDetailForm from "@/features/tasks/components/Form/TaskDetailForm";
import type { Task } from "@/shared/types/domain";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ListTodo,
  FileEdit,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import type { AgentActivity } from "@/shared/types/domain";

interface AgentActivityListProps {
  activities?: AgentActivity[];
  onOpenTask?: (taskId: string) => void;
}

export function AgentActivityList({
  activities = [],
  onOpenTask,
}: AgentActivityListProps) {
  const { t } = useTranslation("agent");

  const [detail, setDetail] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const active = useRef(true);
  const request = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const openTask = async (id: string) => {
    if (onOpenTask) {
      onOpenTask(id);
      return;
    }
    const version = ++request.current;
    setError("");
    try {
      const task = await taskService.getTaskById(id);
      if (active.current && request.current === version) setDetail(task);
    } catch {
      if (active.current && request.current === version)
        setError(t("taskIsNoLongerAvailable"));
    }
  };
  // Deduplicate activities by id
  const seenIds = new Set<string>();
  const uniqueActivities: AgentActivity[] = [];
  for (const act of activities) {
    if (!seenIds.has(act.id)) {
      seenIds.add(act.id);
      uniqueActivities.push(act);
    }
  }

  if (uniqueActivities.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--color-text-muted)]">
        {t("noActivityResultsYet")}
      </div>
    );
  }

  const renderKindIcon = (kind: AgentActivity["kind"]) => {
    switch (kind) {
      case "task_created":
        return <ListTodo className="h-4 w-4 text-emerald-500" />;
      case "task_deleted":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case "task_updated":
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case "proposal_created":
        return <FileSpreadsheet className="h-4 w-4 text-purple-500" />;
      default:
        return <ListTodo className="h-4 w-4 text-gray-400" />;
    }
  };

  const renderStatusBadge = (status: AgentActivity["status"]) => {
    switch (status) {
      case "succeeded":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {t("success")}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            {t("failed")}
          </span>
        );
      case "unknown":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-500">
            <HelpCircle className="h-3 w-3" />
            {t("unknown")}
          </span>
        );
    }
  };

  const formatKindLabel = (kind: AgentActivity["kind"]) => {
    switch (kind) {
      case "task_created":
        return t("createdTask");
      case "task_deleted":
        return t("taskDeleted");
      case "task_updated":
        return t("updatedTask");
      case "proposal_created":
        return t("taskProposal");
      default:
        return t("action");
    }
  };

  return (
    <div className="space-y-3">
      {error && <p role="alert">{error}</p>}
      {detail && (
        <TaskDetailForm
          task={detail}
          onClose={() => setDetail(null)}
          onTaskUpdated={() => setDetail(null)}
          onProjectCreated={() => undefined}
        />
      )}
      {uniqueActivities.map((act) => (
        <div
          key={act.id}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-sm shadow-2xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {renderKindIcon(act.kind)}
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {act.status === "succeeded"
                  ? formatKindLabel(act.kind)
                  : act.kind === "task_created"
                    ? t("createTask")
                    : t("updateTask")}
              </span>
            </div>
            {renderStatusBadge(act.status)}
          </div>

          <div className="mt-2 font-medium text-[var(--color-text)]">
            {act.title}
          </div>

          {act.resourceType === "task" &&
            act.kind !== "task_deleted" &&
            act.resourceId && (
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>
                  {t("id")}
                  {act.resourceId}
                </span>
                {act.status === "succeeded" && (
                  <button
                    type="button"
                    onClick={() => void openTask(act.resourceId!)}
                    className="font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {t("viewDetails")}
                  </button>
                )}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
