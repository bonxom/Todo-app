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
    <div ref={actions} className="notification-bulk-actions" tabIndex={-1}>
      <div className="notification-action-buttons">
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
          className="notification-delete-confirmation"
          data-escape-boundary="true"
          role="group"
          aria-label={t("notifications.deleteConfirmTitle")}
        >
          <p>{t("notifications.deleteConfirm")}</p>
          <div className="notification-action-buttons">
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
