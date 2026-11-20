import { useRef, useState, type CSSProperties } from "react";
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
import { useSettingsStore } from "@/stores/useSettingsStore";
import NotificationList from "./NotificationList";
import NotificationBulkActions from "./NotificationBulkActions";
function NotificationPanel({
  onClose,
  version,
  top,
}: {
  onClose: () => void;
  version: "v1" | "v2";
  top: number;
}) {
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
      void navigate(
        `${version === "v2" ? "/v2/dashboard" : "/dashboard"}?taskId=${encodeURIComponent(item.taskId)}`,
      );
    } catch {
      /* mutation error is shown below */
    }
  };
  return createPortal(
    <div
      className={
        version === "v2"
          ? "notification-overlay fixed v2-app v2-notification-overlay [--color-text:var(--v2-ink)] [--color-text-muted:var(--v2-muted)] [--color-accent:var(--v2-accent)] [--color-accent-soft:color-mix(_in_srgb,var(--v2-accent)_10%,var(--v2-surface-solid)_)] [--color-surface:var(--v2-surface-solid)] [--color-surface-muted:var(--v2-shell-fill)] [--color-line:var(--v2-border)] [--color-danger-soft:rgb(171_60_53_/_9%)] [&_.notification-panel]:overscroll-contain [&_.notification-panel]:flex-col [&_.notification-panel_>_header]:shrink-0 [&_.notification-panel_>_footer]:shrink-0 [&_.notification-bulk-actions]:shrink-0 [&_.notification-list]:overflow-y-auto [&_.notification-list]:overscroll-contain"
          : "notification-overlay fixed"
      }
      style={
        version === "v2"
          ? ({ "--notification-top": `${top}px` } as CSSProperties)
          : undefined
      }
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        className="notification-panel absolute w-[min(420px,calc(100vw_-_24px))] [&_header]:flex [&_header]:justify-between
          [&_header]:gap-[16px] [&_header]:p-[20px] [&_header]:[border-bottom:1px_solid_var(--color-line)]
          [&_h2]:text-[20px] [&_h2]:[font-weight:600] [&_header_p]:text-[13px]
          [&_header_p]:text-[var(--color-text-muted)] [&_header_p]:mt-[6px] [&_footer]:p-[16px_20px]
          [&_footer]:[border-top:1px_solid_var(--color-line)] [&_footer]:text-center
          [&_footer]:text-[var(--color-accent)] [&_footer]:[font-weight:600]"
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
            className="ui-icon-button items-center justify-center
              [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
              [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
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
          <p
            className="notification-state p-[20px] text-[14px] [&_button]:mt-[10px] [&_button]:block"
            role="status"
          >
            {t("notifications.loading")}
          </p>
        )}
        {list.isError && (
          <div
            className="notification-state p-[20px] text-[14px] [&_button]:mt-[10px] [&_button]:block"
            role="alert"
          >
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
          <p
            className="notification-state p-[20px] text-[14px] [&_button]:mt-[10px] [&_button]:block"
            role="alert"
          >
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
            <p className="notification-state p-[20px] text-[14px] [&_button]:mt-[10px] [&_button]:block">
              {t("notifications.empty")}
            </p>
          ))}
        <footer>
          <Link
            className="ui-focus-ring"
            to={version === "v2" ? "/v2/notifications" : "/notifications"}
            onClick={onClose}
          >
            {t("notifications.viewAll")}
          </Link>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
export default function NotificationBell({
  version = "v1",
}: { version?: "v1" | "v2" } = {}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(88);
  const count = useUnreadCountQuery();
  const showUnreadBadge = useSettingsStore(
    (s) => s.notifications.showUnreadBadge,
  );
  const value = count.data?.count;
  return (
    <>
      <button
        type="button"
        className={`ui-icon-button items-center justify-center [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease] [&:hover]:[transform:translateY(-1px)] ui-focus-ring notification-trigger relative${version === "v2" ? " v2-btn v2-notification-trigger [@media(forced-colors:active)]:[&_.notification-badge]:[forced-color-adjust:none]" : ""}`}
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
        onClick={(event) => {
          setTop(event.currentTarget.getBoundingClientRect().bottom + 12);
          setOpen(true);
          void count.refetch();
        }}
      >
        <Bell size={19} aria-hidden="true" />
        {showUnreadBadge && value !== undefined && value > 0 && (
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
            className="notification-count-error absolute top-[-5px] right-[-3px] text-[var(--color-danger)] [font-weight:700]"
            aria-label={t("notifications.loadError")}
          >
            !
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          onClose={() => setOpen(false)}
          version={version}
          top={top}
        />
      )}
    </>
  );
}
