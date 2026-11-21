import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import type { ToolProgress } from "@/shared/types/chatStream";

export interface AgentProcessPanelProps {
  toolProgress?: ToolProgress[];
  isLive?: boolean;
  hasResponseText?: boolean;
  compact?: boolean;
}

function isStepRunning(status: ToolProgress["status"] | string): boolean {
  return status === "started" || status === "running";
}

function StepIcon({ status }: { status: ToolProgress["status"] | string }) {
  if (status === "succeeded") {
    return (
      <CheckCircle2
        className="agent-process-icon agent-process-icon--success"
        size={13}
        aria-hidden="true"
      />
    );
  }
  if (status === "failed") {
    return (
      <XCircle
        className="agent-process-icon agent-process-icon--error"
        size={13}
        aria-hidden="true"
      />
    );
  }
  if (status === "unknown") {
    return (
      <HelpCircle
        className="agent-process-icon agent-process-icon--muted"
        size={13}
        aria-hidden="true"
      />
    );
  }
  return (
    <Loader2
      className="agent-process-icon agent-process-icon--live motion-safe:animate-spin"
      size={13}
      aria-hidden="true"
    />
  );
}

export default function AgentProcessPanel({
  toolProgress = [],
  isLive = false,
  hasResponseText = false,
  compact = false,
}: AgentProcessPanelProps) {
  const { t } = useTranslation("agent");
  const listId = useId();
  const [expanded, setExpanded] = useState(false);

  if (!isLive && toolProgress.length === 0) {
    return null;
  }

  // While running, show minimal live lines directly without a nested box or duplicate header.
  if (isLive) {
    const hasRunningTool = toolProgress.some((step) =>
      isStepRunning(step.status),
    );
    const showThinkingTail =
      toolProgress.length === 0 || (!hasRunningTool && !hasResponseText);

    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="agent-process-live"
        className={`agent-process-panel agent-process-panel--live ${compact ? "agent-process-panel--compact" : ""}`.trim()}
      >
        {toolProgress.map((tool) => (
          <div
            key={tool.toolCallId}
            data-testid={`tool-progress-${tool.toolCallId}`}
            className="agent-process-step"
          >
            <StepIcon status={tool.status} />
            <span className="agent-process-step-label">
              {tool.label || t("processingTask")}
            </span>
            {tool.summary && (
              <span className="agent-process-step-summary">{tool.summary}</span>
            )}
          </div>
        ))}
        {showThinkingTail && (
          <div
            className="agent-process-step"
            data-testid="agent-process-thinking-step"
          >
            <Loader2
              className="agent-process-icon agent-process-icon--live motion-safe:animate-spin"
              size={13}
              aria-hidden="true"
            />
            <span className="agent-process-step-label">{t("thinking")}</span>
          </div>
        )}
      </div>
    );
  }

  // After completion, collapse into a minimal borderless summary toggle.
  const hasErrors = toolProgress.some((step) => step.status === "failed");
  const summaryLabel = hasErrors
    ? t("processStepsWithErrors", { count: toolProgress.length })
    : t("processSteps", { count: toolProgress.length });

  return (
    <div
      className={`agent-process-panel ${compact ? "agent-process-panel--compact" : ""}`.trim()}
      data-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        data-testid="agent-process-toggle"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={`${summaryLabel} — ${t("toggleAgentProcess")}`}
        onClick={() => setExpanded((prev) => !prev)}
        className="agent-process-trigger ui-focus-ring"
      >
        {hasErrors ? (
          <XCircle
            className="agent-process-icon agent-process-icon--error"
            size={13}
            aria-hidden="true"
          />
        ) : (
          <CheckCircle2
            className="agent-process-icon agent-process-icon--success"
            size={13}
            aria-hidden="true"
          />
        )}
        <span className="agent-process-title">{summaryLabel}</span>
        <ChevronDown
          size={13}
          className="agent-process-chevron"
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={listId} className="agent-process-steps">
          {toolProgress.map((tool) => (
            <div
              key={tool.toolCallId}
              data-testid={`tool-progress-${tool.toolCallId}`}
              className="agent-process-step"
            >
              <StepIcon status={tool.status} />
              <span className="agent-process-step-label">
                {tool.label || t("processingTask")}
              </span>
              {tool.summary && (
                <span className="agent-process-step-summary">
                  {tool.summary}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
