import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import {
  useUnreadCountQuery,
  useNotificationsQuery,
} from "../api/notificationQueries";
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteAllNotificationsMutation,
} from "../api/notificationMutations";
import type { NotificationDto } from "@/shared/types/notification";
import NotificationList from "./NotificationList";
import NotificationBulkActions from "./NotificationBulkActions";
import "../notifications.css";
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const panel = useRef<HTMLElement>(null);
  useModalKeyboard(true, panel, onClose);
  const list = useNotificationsQuery({
    pageNo: 1,
    pageSize: 10,
    filter: "all",
  });
  const read = useMarkNotificationReadMutation();
  const all = useMarkAllNotificationsReadMutation();
  const remove = useDeleteAllNotificationsMutation();
  const count = useUnreadCountQuery();
  const busy = read.isPending || all.isPending || remove.isPending;
  const open = async (item: NotificationDto) => {
    try {
      await read.mutateAsync(item._id);
      onClose();
      void navigate(`/dashboard?taskId=${encodeURIComponent(item.taskId)}`);
    } catch {
      /* mutation error is shown below */
    }
  };
  return createPortal(
    <div
      className="notification-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        className="notification-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("notifications.title")}
      >
        <header>
          <div>
            <h2>{t("notifications.title")}</h2>
            <p>{t("notifications.subtitle")}</p>
          </div>
          <button
            type="button"
            className="ui-icon-button ui-focus-ring"
            aria-label={t("notifications.close")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <NotificationBulkActions
          disabled={busy}
          hasItems={(list.data?.pageInfo.totalCount ?? 0) > 0}
          hasUnread={(count.data?.count ?? 0) > 0}
          onMarkAll={() => all.mutateAsync()}
          onDeleteAll={() => remove.mutateAsync()}
        />
        {list.isPending && (
          <p className="notification-state" role="status">
            {t("notifications.loading")}
          </p>
        )}
        {list.isError && (
          <div className="notification-state" role="alert">
            {t("notifications.loadError")}{" "}
            <button
              className="ui-btn-secondary"
              onClick={() => void list.refetch()}
            >
              {t("notifications.retry")}
            </button>
          </div>
        )}
        {(read.isError || all.isError || remove.isError) && (
          <p className="notification-state" role="alert">
            {t("notifications.updateError")}
          </p>
        )}
        {list.data &&
          (list.data.data.length ? (
            <NotificationList
              items={list.data.data}
              onOpen={open}
              onMarkRead={(item) => read.mutateAsync(item._id)}
              pendingId={busy ? "busy" : undefined}
            />
          ) : (
            <p className="notification-state">{t("notifications.empty")}</p>
          ))}
        <footer>
          <Link className="ui-focus-ring" to="/notifications" onClick={onClose}>
            {t("notifications.viewAll")}
          </Link>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
export default function NotificationBell() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const count = useUnreadCountQuery();
  const value = count.data?.count;
  return (
    <>
      <button
        type="button"
        className="ui-icon-button ui-focus-ring notification-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          value === undefined
            ? t("notifications.title")
            : t("notifications.count", { count: value })
        }
        title={
          count.isError
            ? t("notifications.loadError")
            : t("notifications.title")
        }
        onClick={() => {
          setOpen(true);
          void count.refetch();
        }}
      >
        <Bell size={19} aria-hidden="true" />
        {value !== undefined && value > 0 && (
          <span
            className="notification-badge"
            data-testid="notification-badge"
            aria-hidden="true"
          >
            {value > 99 ? "99+" : value}
          </span>
        )}
        {count.isError && (
          <span
            className="notification-count-error"
            aria-label={t("notifications.loadError")}
          >
            !
          </span>
        )}
      </button>
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  );
}
