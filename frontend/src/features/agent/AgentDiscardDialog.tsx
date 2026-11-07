import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import { AlertTriangle } from "lucide-react";

interface AgentDiscardDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AgentDiscardDialog({
  isOpen,
  onConfirm,
  onCancel,
}: AgentDiscardDialogProps) {
  const { t } = useTranslation("agent");

  const dialogRef = useRef<HTMLDivElement>(null);

  useModalKeyboard(isOpen, dialogRef, onCancel);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
      data-testid="discard-dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3
              id="discard-dialog-title"
              className="text-base font-semibold text-[var(--color-text)]"
            >
              {t("discardCurrentChanges")}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t(
                "youHaveUnsentDraftsOrUnsavedProposalsSwitchingConversationsOrLeavingWillDiscardTheseChanges",
              )}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
          >
            {t("keepEditing")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t("discardChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
