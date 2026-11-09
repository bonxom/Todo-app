import { Clock3, CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLocale } from "@/shared/i18n";
import type { NotificationDto } from "@/shared/types/notification";
export default function NotificationList({
  items,
  onOpen,
  pendingId,
}: {
  items: NotificationDto[];
  onOpen: (item: NotificationDto) => void;
  pendingId?: string;
}) {
  const { t } = useTranslation("common");
  const date = (value: string) =>
    new Intl.DateTimeFormat(getLocale(), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <ul className="notification-list">
      {items.map((item) => (
        <li key={item._id}>
          <button
            type="button"
            className="notification-item ui-focus-ring"
            data-unread={!item.readAt}
            disabled={Boolean(pendingId)}
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
        </li>
      ))}
    </ul>
  );
}
