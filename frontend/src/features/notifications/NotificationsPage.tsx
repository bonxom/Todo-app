import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import type { NotificationDto } from "@/shared/types/notification";
import { useNotificationsQuery } from "./api/notificationQueries";
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from "./api/notificationMutations";
import NotificationList from "./components/NotificationList";
import "./notifications.css";
export default function NotificationsPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [pageNo, setPageNo] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const list = useNotificationsQuery({ pageNo, pageSize: 20, filter });
  const read = useMarkNotificationReadMutation();
  const all = useMarkAllNotificationsReadMutation();
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
        <button
          className="ui-btn-secondary"
          disabled={all.isPending || read.isPending}
          onClick={() => {
            all.mutate(undefined, { onSuccess: () => setPageNo(1) });
          }}
        >
          {t("notifications.markAll")}
        </button>
      </header>
      <div
        className="notification-filters"
        aria-label={t("notifications.filter")}
      >
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
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
      {(read.isError || all.isError) && (
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
                pendingId={
                  read.isPending
                    ? read.variables
                    : all.isPending
                      ? "all"
                      : undefined
                }
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
