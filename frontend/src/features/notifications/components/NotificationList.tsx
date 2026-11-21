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
    <li
      className="notification-row
      [&[data-unread=true]]:[background:color-mix(_in_srgb,var(--color-accent-soft)_45%,var(--color-surface)_)] flex
      items-center [&_.notification-item]:flex-1 [&_.notification-item]:min-w-[0]"
      data-unread={!item.readAt}
    >
      <button
        ref={openButton}
        type="button"
        className="notification-item flex gap-[14px] text-left w-full [background:transparent]
          [&:hover]:[background:var(--color-surface-muted)] [&:disabled]:cursor-wait [&:disabled]:opacity-[0.7]
          ui-focus-ring"
        disabled={Boolean(pendingId)}
        aria-label={t("notifications.openTask", { title: item.taskTitle })}
        onClick={() => onOpen(item)}
      >
        <span
          className="notification-kind grid place-items-center w-[34px] h-[34px] shrink-0 rounded-[10px] text-[var(--color-accent)]
            [background:var(--color-accent-soft)] [&[data-kind=overdue]]:text-[var(--color-danger)]
            [&[data-kind=overdue]]:[background:var(--color-danger-soft)]"
          data-kind={item.type}
          aria-hidden="true"
        >
          {item.type === "overdue" ? (
            <CircleAlert size={18} />
          ) : (
            <Clock3 size={18} />
          )}
        </span>
        <span
          className="notification-copy flex flex-col gap-[5px] min-w-[0] wrap-anywhere [&_strong]:[font-weight:600]
          [&_strong]:text-[14px] [&_>_span:not(.notification-type)]:text-[12px]
          [&_>_span:not(.notification-type)]:text-[var(--color-text-muted)] [&_time]:text-[12px]
          [&_time]:text-[var(--color-text-muted)]"
        >
          <span className="notification-type flex items-center gap-[10px] flex-wrap text-[11px] text-[var(--color-text-muted)]">
            {t(`notifications.${item.type}`)}
            {!item.readAt && (
              <span
                className="notification-unread text-[var(--color-accent)] [font-weight:600] [&::before]:inline-block [&::before]:w-[5px]
                [&::before]:h-[5px] [&::before]:rounded-[50%] [&::before]:[background:currentColor] [&::before]:mr-[5px]
                [&::before]:align-middle"
              >
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
          className="ui-icon-button items-center justify-center
            [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
            [&:hover]:[transform:translateY(-1px)] ui-focus-ring notification-mark-read mr-[12px]"
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
    <ul className="notification-list [list-style:none] m-[0] p-[0] [&_li_+_li]:[border-top:1px_solid_var(--color-line)]">
      {items.map((item) => (
        <NotificationRow key={item._id} item={item} {...actions} />
      ))}
    </ul>
  );
}
