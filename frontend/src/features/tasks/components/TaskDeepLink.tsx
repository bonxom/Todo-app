import { ApiError } from "@/shared/services/apiError";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTaskQuery } from "../api/taskQueries";
import TaskDetailButton from "./TaskDetailButton";
export default function TaskDeepLink() {
  const [params, setParams] = useSearchParams();
  const id = params.get("taskId") ?? "";
  const valid = /^[a-f0-9]{24}$/i.test(id);
  const { t } = useTranslation("common");
  const task = useTaskQuery(id, {
    enabled: valid,
    retry: false,
    refetchOnMount: "always",
  });
  const close = () => {
    const next = new URLSearchParams(params);
    next.delete("taskId");
    setParams(next, { replace: true });
  };
  if (!id) return null;
  const status = task.error instanceof ApiError ? task.error.status : undefined;
  const unavailable = !valid || status === 403 || status === 404;
  if (unavailable || (task.isError && !task.data))
    return (
      <div role="alert" className="notification-state">
        {t(
          unavailable ? "notifications.unavailable" : "notifications.taskError",
        )}
        {!unavailable && (
          <button
            className="ui-btn-secondary"
            onClick={() => void task.refetch()}
          >
            {t("notifications.retry")}
          </button>
        )}
        <button className="ui-btn-secondary" onClick={close}>
          {t("notifications.closeTask")}
        </button>
      </div>
    );
  if (task.isPending) return <p role="status">{t("notifications.loading")}</p>;
  return (
    <TaskDetailButton
      key={id}
      isOpen
      task={task.data}
      onClose={close}
      onTaskUpdated={() => void task.refetch()}
      onProjectCreated={() => void task.refetch()}
    />
  );
}
