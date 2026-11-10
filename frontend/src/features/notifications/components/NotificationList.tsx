import { useRef } from "react";
import { Clock3, CircleAlert, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLocale } from "@/shared/i18n";
import type { NotificationDto } from "@/shared/types/notification";
interface Actions {
  onOpen: (item: NotificationDto) => void;
  onMarkRead: (item: NotificationDto) => Promise<unknown>;
  pendingId?: string;
  restoreRowFocus?: boolean;
}
function NotificationRow({
  item,
  onOpen,
  onMarkRead,
  pendingId,
  restoreRowFocus = true,
}: { item: NotificationDto } & Actions) {
  const { t } = useTranslation("common");
  const openButton = useRef<HTMLButtonElement>(null);
  const date = (value: string) =>
    new Intl.DateTimeFormat(getLocale(), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const mark = async () => {
    try {
      await onMarkRead(item);
      if (restoreRowFocus) openButton.current?.focus();
    } catch {
      /* Parent displays failure. */
    }
  };
  return (
    <li className="notification-row" data-unread={!item.readAt}>
      <button
        ref={openButton}
        type="button"
        className="notification-item ui-focus-ring"
        disabled={Boolean(pendingId)}
        aria-label={t("notifications.openTask", { title: item.taskTitle })}
        onClick={() => onOpen(item)}
      >
        <span
          className="notification-kind"
          data-kind={item.type}
          aria-hidden="true"
        >
          {item.type === "overdue" ? (
            <CircleAlert size={18} />
          ) : (
            <Clock3 size={18} />
          )}
        </span>
        <span className="notification-copy">
          <span className="notification-type">
            {t(`notifications.${item.type}`)}
            {!item.readAt && (
              <span className="notification-unread">
                {t("notifications.unread")}
              </span>
            )}
          </span>
          <strong>{item.taskTitle}</strong>
          <span>{t("notifications.due", { date: date(item.dueAt) })}</span>
          <time dateTime={item.createdAt}>{date(item.createdAt)}</time>
        </span>
      </button>
      {!item.readAt && (
        <button
          type="button"
          className="ui-icon-button ui-focus-ring notification-mark-read"
          disabled={Boolean(pendingId)}
          aria-label={t("notifications.markReadFor", { title: item.taskTitle })}
          title={t("notifications.markRead")}
          onClick={() => void mark()}
        >
          <Check size={17} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
export default function NotificationList({
  items,
  ...actions
}: { items: NotificationDto[] } & Actions) {
  return (
    <ul className="notification-list">
      {items.map((item) => (
        <NotificationRow key={item._id} item={item} {...actions} />
      ))}
    </ul>
  );
}
