import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { NotificationDto } from "@/shared/types/notification";
import {
  useNotificationsQuery,
  useUnreadCountQuery,
} from "./api/notificationQueries";
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteAllNotificationsMutation,
} from "./api/notificationMutations";
import NotificationList from "./components/NotificationList";
import NotificationBulkActions from "./components/NotificationBulkActions";
export default function NotificationsPage({
  version = "v1",
}: { version?: "v1" | "v2" } = {}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [pageNo, setPageNo] = useState(1);
  const unreadFilter = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<"all" | "unread">(
    () => useSettingsStore.getState().notifications.defaultFilter,
  );
  const list = useNotificationsQuery({ pageNo, pageSize: 20, filter });
  const read = useMarkNotificationReadMutation();
  const all = useMarkAllNotificationsReadMutation();
  const remove = useDeleteAllNotificationsMutation();
  const count = useUnreadCountQuery();
  const history = useNotificationsQuery(
    { pageNo: 1, pageSize: 1, filter: "all" },
    filter === "unread",
  );
  const totalCount =
    filter === "all"
      ? list.data?.pageInfo.totalCount
      : history.data?.pageInfo.totalCount;
  const busy = read.isPending || all.isPending || remove.isPending;
  const open = async (item: NotificationDto) => {
    try {
      await read.mutateAsync(item._id);
      void navigate(
        `${version === "v2" ? "/v2/dashboard" : "/dashboard"}?taskId=${encodeURIComponent(item.taskId)}`,
      );
    } catch {
      /* render mutation error */
    }
  };
  return (
    <div
      className={`ui-page-shell mx-auto notifications-page [&_header_p]:text-[13px] [&_header_p]:text-[var(--color-text-muted)] max-w-[1000px]${version === "v2" ? " v2-notifications-page [--color-text:var(--v2-ink)] [--color-text-muted:var(--v2-muted)] [--color-accent:var(--v2-accent)] [--color-accent-soft:color-mix(_in_srgb,var(--v2-accent)_10%,var(--v2-surface-solid)_)] [--color-surface:var(--v2-surface-solid)] [--color-surface-muted:var(--v2-shell-fill)] [--color-line:var(--v2-border)] [--color-danger-soft:rgb(171_60_53_/_9%)] max-w-none p-[0] [&_:focus-visible]:[outline:2px_solid_var(--v2-accent)] [&_:focus-visible]:outline-offset-[3px] [&_.ui-page-title]:[font-family:var(--v2-font-heading)] [@media(forced-colors:active)]:[&_.notification-history]:[backdrop-filter:none]" : ""}`}
    >
      <header className="ui-workspace-heading flex items-center justify-between">
        <div>
          <h1 className="ui-page-title m-[0] text-[var(--color-text)] [font-weight:650] text-balance">
            {t("notifications.title")}
          </h1>
          <p>{t("notifications.subtitle")}</p>
        </div>
      </header>
      <NotificationBulkActions
        disabled={busy}
        hasItems={(totalCount ?? 0) > 0}
        hasUnread={(count.data?.count ?? 0) > 0}
        onMarkAll={() => all.mutateAsync()}
        onDeleteAll={async () => {
          const result = await remove.mutateAsync();
          setPageNo(1);
          return result;
        }}
      />
      <div
        className="notification-filters flex gap-[8px] m-[20px_0] [&_button]:p-[8px_18px] [&_button]:rounded-[20px] [&_button[aria-pressed=true]]:[background:var(--color-accent-soft)]"
        aria-label={t("notifications.filter")}
      >
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            ref={value === "unread" ? unreadFilter : undefined}
            type="button"
            className="ui-focus-ring"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPageNo(1);
            }}
          >
            {t(`notifications.${value}`)}
          </button>
        ))}
      </div>
      {(read.isError || all.isError || remove.isError) && (
        <p
          role="alert"
          className="notification-state p-[20px] text-[14px] [&_button]:mt-[10px] [&_button]:block"
        >
          {t("notifications.updateError")}
        </p>
      )}
      {list.isPending && (
        <p
          role="status"
          className="notification-state p-[20px] text-[14px] [&_button]:mt-[10px] [&_button]:block"
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
      {list.data && (
        <>
          <section
            className="notification-history overflow-hidden"
            aria-label={t("notifications.history")}
          >
            {list.data.data.length ? (
              <NotificationList
                items={list.data.data}
                onOpen={open}
                restoreRowFocus={filter !== "unread"}
                onMarkRead={async (item) => {
                  const result = await read.mutateAsync(item._id);
                  if (filter === "unread") unreadFilter.current?.focus();
                  return result;
                }}
                pendingId={busy ? "busy" : undefined}
              />
            ) : (
              <div className="notification-empty p-[64px_24px] text-center grid justify-items-center gap-[12px] text-[var(--color-text-muted)] [&_h2]:text-[var(--color-text)] [&_h2]:text-[22px]">
                <Bell size={28} aria-hidden="true" />
                <h2>{t("notifications.empty")}</h2>
                <p>{t("notifications.emptyHint")}</p>
                {pageNo > 1 && (
                  <button
                    className="ui-btn-secondary"
                    onClick={() => setPageNo(1)}
                  >
                    {t("notifications.firstPage")}
                  </button>
                )}
              </div>
            )}
          </section>
          <Pagination {...list.data.pageInfo} onPageChange={setPageNo} />
        </>
      )}
    </div>
  );
}
