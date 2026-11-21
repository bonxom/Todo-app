import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import type { ReasoningBlock, ToolProgress } from "@/shared/types/chatStream";
import { formatToolProcessStep } from "./toolProcessText";

export interface AgentProcessPanelProps {
  toolProgress?: ToolProgress[];
  reasoningBlocks?: ReasoningBlock[];
  isLive?: boolean;
  hasResponseText?: boolean;
  compact?: boolean;
}

type TimelineItem =
  | {
      kind: "reasoning";
      key: string;
      order: number;
      seqFallback: number;
      block: ReasoningBlock;
    }
  | {
      kind: "tool";
      key: string;
      order: number;
      seqFallback: number;
      tool: ToolProgress;
    };

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

function buildTimeline(
  reasoningBlocks: ReasoningBlock[],
  toolProgress: ToolProgress[],
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let seqFallback = 0;

  for (const block of reasoningBlocks) {
    if (!block.text?.trim()) continue;
    items.push({
      kind: "reasoning",
      key: `reasoning:${block.blockId}`,
      order:
        typeof block.order === "number" ? block.order : Number.MAX_SAFE_INTEGER,
      seqFallback: seqFallback++,
      block,
    });
  }

  for (const tool of toolProgress) {
    items.push({
      kind: "tool",
      key: `tool:${tool.toolCallId}`,
      order:
        typeof tool.order === "number" ? tool.order : Number.MAX_SAFE_INTEGER,
      seqFallback: seqFallback++,
      tool,
    });
  }

  return items.sort((a, b) =>
    a.order !== b.order ? a.order - b.order : a.seqFallback - b.seqFallback,
  );
}

export default function AgentProcessPanel({
  toolProgress = [],
  reasoningBlocks = [],
  isLive = false,
  hasResponseText = false,
  compact = false,
}: AgentProcessPanelProps) {
  const { t } = useTranslation("agent");
  const listId = useId();
  const [expanded, setExpanded] = useState(false);

  const visibleReasoningBlocks = useMemo(
    () => reasoningBlocks.filter((b) => Boolean(b.text?.trim())),
    [reasoningBlocks],
  );
  const timeline = useMemo(
    () => buildTimeline(visibleReasoningBlocks, toolProgress),
    [visibleReasoningBlocks, toolProgress],
  );

  const hasReasoning = visibleReasoningBlocks.length > 0;
  const hasTools = toolProgress.length > 0;

  if (!isLive && !hasTools && !hasReasoning) {
    return null;
  }

  const renderTimelineItems = (liveMode: boolean) =>
    timeline.map((item, idx) => {
      if (item.kind === "reasoning") {
        const isActiveBlock =
          liveMode && idx === timeline.length - 1 && !hasResponseText;
        return (
          <div
            key={item.key}
            data-testid={`reasoning-block-${item.block.blockId}`}
            className={`agent-process-thinking-block ${
              liveMode ? "agent-process-thinking-block--live" : ""
            } ${isActiveBlock ? "agent-process-thinking-block--active" : ""}`.trim()}
          >
            <div className="agent-process-thinking-header">
              {isActiveBlock ? (
                <Loader2
                  className="agent-process-icon agent-process-icon--live motion-safe:animate-spin"
                  size={12}
                  aria-hidden="true"
                />
              ) : (
                <Brain
                  className="agent-process-icon agent-process-icon--muted"
                  size={12}
                  aria-hidden="true"
                />
              )}
              <span>{isActiveBlock ? t("thinking") : t("thoughtLabel")}</span>
            </div>
            <p className="agent-process-thinking-text">{item.block.text}</p>
          </div>
        );
      }

      const formatted = formatToolProcessStep(item.tool, t);
      return (
        <div
          key={item.key}
          data-testid={`tool-progress-${item.tool.toolCallId}`}
          className="agent-process-step"
        >
          <StepIcon status={item.tool.status} />
          <span className="agent-process-step-label">{formatted.primary}</span>
          {formatted.detail && (
            <span className="agent-process-step-summary">
              {formatted.detail}
            </span>
          )}
        </div>
      );
    });

  // While running, show minimal live lines & streaming thinking blocks directly.
  if (isLive) {
    const hasRunningTool = toolProgress.some((step) =>
      isStepRunning(step.status),
    );
    const lastItem = timeline[timeline.length - 1];
    const isActivelyStreamingReasoning =
      lastItem?.kind === "reasoning" && !hasResponseText;
    const showThinkingTail =
      timeline.length === 0 ||
      (!hasRunningTool && !hasResponseText && !isActivelyStreamingReasoning);

    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="agent-process-live"
        className={`agent-process-panel agent-process-panel--live ${compact ? "agent-process-panel--compact" : ""}`.trim()}
      >
        {renderTimelineItems(true)}
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
  const summaryLabel = !hasTools
    ? t("thoughtOnly")
    : hasReasoning
      ? hasErrors
        ? t("thoughtWithStepsErrors", { count: toolProgress.length })
        : t("thoughtWithSteps", { count: toolProgress.length })
      : hasErrors
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
        ) : !hasTools && hasReasoning ? (
          <Brain
            className="agent-process-icon agent-process-icon--muted"
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
          {renderTimelineItems(false)}
        </div>
      )}
    </div>
  );
}
