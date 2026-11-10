import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
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
import "./notifications.css";
export default function NotificationsPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [pageNo, setPageNo] = useState(1);
  const unreadFilter = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
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
      void navigate(`/dashboard?taskId=${encodeURIComponent(item.taskId)}`);
    } catch {
      /* render mutation error */
    }
  };
  return (
    <div className="ui-page-shell notifications-page">
      <header className="ui-workspace-heading">
        <div>
          <h1 className="ui-page-title">{t("notifications.title")}</h1>
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
        className="notification-filters"
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
        <p role="alert" className="notification-state">
          {t("notifications.updateError")}
        </p>
      )}
      {list.isPending && (
        <p role="status" className="notification-state">
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
      {list.data && (
        <>
          <section
            className="notification-history"
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
              <div className="notification-empty">
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
