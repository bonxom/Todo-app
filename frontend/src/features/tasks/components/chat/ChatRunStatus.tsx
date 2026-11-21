import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Square,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  WifiOff,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { TurnSnapshot } from "@/shared/types/chatStream";
import type { ConnectionState } from "@/features/tasks/hooks/chatStreamReducer";

export interface ChatRunStatusProps {
  run: TurnSnapshot | null;
  connection?: ConnectionState;
  status?: TurnSnapshot["status"];
  hideToolProgress?: boolean;
  onStop?: () => Promise<TurnSnapshot | null | void>;
  onReconnect?: () => Promise<void>;
}

export const ChatRunStatus: React.FC<ChatRunStatusProps> = ({
  run,
  status,
  connection = "idle",
  hideToolProgress = false,
  onStop,
  onReconnect,
}) => {
  const { t } = useTranslation("agent");
  const [isStopping, setIsStopping] = useState(false);

  const runStatus = run?.status ?? status;
  const isProcessing = runStatus === "processing";
  const isStoppingState = isStopping || runStatus === "stopping";
  const hasBanner =
    connection === "offline" ||
    connection === "reconnecting" ||
    connection === "error";
  const hasToolProgress = Boolean(
    !hideToolProgress && run && run.toolProgress && run.toolProgress.length > 0,
  );
  const hasTerminalBadge =
    runStatus === "cancelled" ||
    runStatus === "failed" ||
    runStatus === "timed_out" ||
    runStatus === "interrupted";
  const hasStopControl = Boolean(
    (isStoppingState && onStop) ||
    isStopping ||
    (runStatus === "stopping" && onStop) ||
    (isProcessing && onStop),
  );

  if (!hasBanner && !hasToolProgress && !hasTerminalBadge && !hasStopControl) {
    return null;
  }

  const handleStop = async () => {
    if (!onStop || isStopping) return;
    setIsStopping(true);
    try {
      await onStop();
    } catch {
      // If stop request fails, do not falsely claim stopped
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="chat-run-status my-2 flex flex-col gap-2 text-xs">
      {/* Offline banner */}
      {connection === "offline" && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-warning,#fffbeb)] p-2.5 text-[var(--color-text-warning,#b45309)] border border-[var(--color-line-warning,#fef3c7)]"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t("offlineMessage")}</span>
        </div>
      )}

      {/* Reconnecting banner */}
      {connection === "reconnecting" && (
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] p-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t("reconnecting")}</span>
        </div>
      )}

      {/* Stream connection error with Reconnect button */}
      {connection === "error" && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg bg-[var(--color-surface-danger,#fef2f2)] p-2.5 text-[var(--color-text-danger,#b91c1c)] border border-[var(--color-line-danger,#fee2e2)]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t("connectionError")}</span>
          </div>
          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              data-testid="reconnect-button"
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] shadow-xs hover:bg-[var(--color-surface-hover,#f3f4f6)] cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{t("reconnect")}</span>
            </button>
          )}
        </div>
      )}

      {/* Tool progress live region */}
      {hasToolProgress && run && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2.5"
        >
          {run.toolProgress.map((tool) => (
            <div
              key={tool.toolCallId}
              data-testid={`tool-progress-${tool.toolCallId}`}
              className="flex items-start justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {tool.status === "succeeded" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-success,#16a34a)]" />
                ) : tool.status === "failed" ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-danger,#dc2626)]" />
                ) : tool.status === "unknown" ? (
                  <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--color-accent,#2563eb)]" />
                )}
                <span className="font-medium text-[var(--color-text)] truncate">
                  {tool.label || t("processingTask")}
                </span>
              </div>
              {tool.summary && (
                <span className="text-[var(--color-text-muted)] text-[11px] truncate max-w-[200px]">
                  {tool.summary}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Terminal run status badges */}
      {runStatus === "cancelled" && (
        <div
          data-testid="run-status-cancelled"
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-medium text-[var(--color-text-muted)]"
        >
          <Square className="h-3 w-3" />
          <span>{t("stopped")}</span>
        </div>
      )}

      {runStatus === "failed" && (
        <div
          data-testid="run-status-failed"
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-[var(--color-surface-danger,#fef2f2)] px-2 py-1 text-xs font-medium text-[var(--color-text-danger,#b91c1c)]"
        >
          <XCircle className="h-3 w-3" />
          <span>{t("failedStatus")}</span>
        </div>
      )}

      {runStatus === "timed_out" && (
        <div
          data-testid="run-status-timed_out"
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-[var(--color-surface-warning,#fffbeb)] px-2 py-1 text-xs font-medium text-[var(--color-text-warning,#b45309)]"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>{t("timedOut")}</span>
        </div>
      )}

      {runStatus === "interrupted" && (
        <div
          data-testid="run-status-interrupted"
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-medium text-[var(--color-text-muted)]"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>{t("interrupted")}</span>
        </div>
      )}

      {/* Stop button while active or stopping banner */}
      {hasStopControl && isStoppingState ? (
        <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t("stopping")}</span>
        </div>
      ) : isProcessing && onStop ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleStop}
            aria-label={t("stop")}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] shadow-xs hover:bg-[var(--color-surface-hover,#f3f4f6)] cursor-pointer"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>{t("stop")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
export default ChatRunStatus;
