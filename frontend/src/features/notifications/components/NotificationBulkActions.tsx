import { useEffect, useRef, useState } from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
interface Props {
  disabled: boolean;
  hasItems: boolean;
  hasUnread: boolean;
  onMarkAll: () => Promise<unknown>;
  onDeleteAll: () => Promise<unknown>;
}
export default function NotificationBulkActions({
  disabled,
  hasItems,
  hasUnread,
  onMarkAll,
  onDeleteAll,
}: Props) {
  const { t } = useTranslation("common");
  const [confirming, setConfirming] = useState(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const returningFocus = useRef(false);
  useEffect(() => {
    if (confirming) cancelButton.current?.focus();
    else if (returningFocus.current) {
      returningFocus.current = false;
      if (deleteButton.current && !deleteButton.current.disabled)
        deleteButton.current.focus();
      else actions.current?.focus();
    }
  }, [confirming]);
  useEffect(() => {
    if (!confirming) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!disabled) {
        returningFocus.current = true;
        setConfirming(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirming, disabled]);
  const cancel = () => {
    returningFocus.current = true;
    setConfirming(false);
  };
  const confirm = async () => {
    try {
      await onDeleteAll();
      setConfirming(false);
      actions.current?.focus();
    } catch {
      /* Parent renders mutation failure; confirmation stays retryable. */
    }
  };
  return (
    <div
      ref={actions}
      className="notification-bulk-actions [border-bottom:1px_solid_var(--color-line)]"
      tabIndex={-1}
    >
      <div
        className="notification-action-buttons flex flex-wrap gap-[8px] [&_button]:inline-flex [&_button]:items-center
        [&_button]:justify-center [&_button]:gap-[6px] [&_button:disabled]:opacity-[0.5]
        [&_button:disabled]:cursor-not-allowed"
      >
        <button
          type="button"
          className="ui-btn-secondary ui-focus-ring"
          disabled={disabled || !hasUnread || confirming}
          onClick={() => {
            void onMarkAll().catch(() => {});
          }}
        >
          <CheckCheck size={16} aria-hidden="true" />
          {t("notifications.markAll")}
        </button>
        <button
          ref={deleteButton}
          type="button"
          className="ui-btn-secondary ui-focus-ring notification-delete"
          disabled={disabled || !hasItems || confirming}
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={16} aria-hidden="true" />
          {t("notifications.deleteAll")}
        </button>
      </div>
      {confirming && (
        <div
          className="notification-delete-confirmation mt-[12px] p-[12px] [border:1px_solid_var(--color-line)] rounded-[10px]
            [background:var(--color-surface-muted)] [&_p]:mb-[12px] [&_p]:text-[13px] [&_p]:text-[var(--color-text)]"
          data-escape-boundary="true"
          role="group"
          aria-label={t("notifications.deleteConfirmTitle")}
        >
          <p>{t("notifications.deleteConfirm")}</p>
          <div
            className="notification-action-buttons flex flex-wrap gap-[8px] [&_button]:inline-flex [&_button]:items-center
            [&_button]:justify-center [&_button]:gap-[6px] [&_button:disabled]:opacity-[0.5]
            [&_button:disabled]:cursor-not-allowed"
          >
            <button
              ref={cancelButton}
              type="button"
              className="ui-btn-secondary ui-focus-ring"
              disabled={disabled}
              onClick={cancel}
            >
              {t("notifications.cancel")}
            </button>
            <button
              type="button"
              className="ui-btn-secondary ui-focus-ring notification-delete"
              disabled={disabled}
              onClick={() => void confirm()}
            >
              {t("notifications.confirmDelete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
