import {
  UNSAFE_DataRouterContext,
  useBlocker,
  useBeforeUnload,
} from "react-router-dom";
import {
  useState,
  useRef,
  useCallback,
  useId,
  useContext,
  useEffect,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useCategoriesQuery } from "@/features/categories/api/categoryQueries";
import { useProjectsQuery } from "@/features/tasks/api/projectQueries";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/features/tasks/api/taskMutations";
import type {
  Task,
  TaskMutationPayload,
  TaskPriority,
} from "@/shared/types/domain";
import {
  toDateTimeInputValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import V2Dialog from "./V2Dialog";
import CustomSelect from "@/shared/components/CustomSelect";
const referenceId = (value: Task["categoryId"] | Task["projectId"]) =>
  typeof value === "string" ? value : (value?._id ?? "");
const initialDraft = (task?: Task) => ({
  title: task?.title ?? "",
  description: task?.description ?? "",
  priority: task?.priority ?? ("Medium" as TaskPriority),
  categoryId: referenceId(task?.categoryId ?? null),
  projectId: referenceId(task?.projectId ?? null),
  startDate: toDateTimeInputValue(task?.startDate),
  dueDate: toDateTimeInputValue(task?.dueDate),
});
function NavigationGuard({
  dirty,
  pending,
}: {
  dirty: boolean;
  pending: boolean;
}) {
  const { t } = useTranslation("v2");
  const blocker = useBlocker(dirty || pending);
  // A save in flight cancels navigation rather than queuing it for later.
  useEffect(() => {
    if (pending && blocker.state === "blocked") blocker.reset();
  }, [pending, blocker]);
  if (blocker.state !== "blocked" || pending) return null;
  return (
    <div
      className="v2-discard-confirmation p-[16px] [border:1px_solid_var(--v2-border)] rounded-[14px] [background:var(--v2-input-fill)] [&_p]:mb-[12px] [&_p]:text-[13px] [&_button]:mr-[8px]"
      role="alert"
    >
      <p>{t("discardPrompt")}</p>
      <button type="button" className="v2-btn" onClick={() => blocker.reset()}>
        {t("keepEditing")}
      </button>
      <button
        type="button"
        className="v2-btn"
        onClick={() => blocker.proceed()}
      >
        {t("discardChanges")}
      </button>
    </div>
  );
}
export default function TaskEditor({
  task,
  onSaved,
  onCancel,
}: {
  task?: Task;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("v2");
  const id = useId();
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  // Snapshot once: query refetches must not replace an open draft.
  const [original] = useState(() => initialDraft(task));
  const [draft, setDraft] = useState(original);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const categories = useCategoriesQuery();
  const projects = useProjectsQuery();
  const create = useCreateTaskMutation();
  const update = useUpdateTaskMutation();
  const saving = useRef(false);
  const pending = create.isPending || update.isPending;
  const dirty = Object.keys(original).some(
    (key) =>
      draft[key as keyof typeof draft] !==
      original[key as keyof typeof original],
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty || saving.current) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty],
    ),
  );
  const close = useCallback(() => {
    if (saving.current) return;
    if (dirty) setDiscard(true);
    else onCancel();
  }, [dirty, onCancel]);
  const choicesLoading = categories.isPending || projects.isPending;
  const choicesFailed = categories.isError || projects.isError;
  const change = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || choicesLoading || choicesFailed) return;
    const title = draft.title.trim();
    if (!title || title.length > 200) {
      setError(t("invalidTitle"));
      return;
    }
    if (draft.description.length > 1000) {
      setError(t("invalidDescription"));
      return;
    }
    if (
      [draft.startDate, draft.dueDate].some(
        (value) => value && Number.isNaN(new Date(value).getTime()),
      )
    ) {
      setError(t("invalidDate"));
      return;
    }
    const payload: TaskMutationPayload = {};
    if (!task || title !== original.title) payload.title = title;
    if (!task || draft.description !== original.description)
      payload.description = draft.description;
    if (!task || draft.priority !== original.priority)
      payload.priority = draft.priority;
    if (draft.categoryId !== original.categoryId || (!task && draft.categoryId))
      payload.categoryId = draft.categoryId || null;
    if (draft.projectId !== original.projectId || (!task && draft.projectId))
      payload.projectId = draft.projectId || null;
    for (const key of ["startDate", "dueDate"] as const) {
      if (task ? draft[key] !== original[key] : Boolean(draft[key]))
        payload[key] = draft[key] ? toISOStringLocal(draft[key]) : null;
    }
    saving.current = true;
    setError("");
    try {
      if (task) await update.mutateAsync({ taskId: task._id, payload });
      else await create.mutateAsync(payload);
      onSaved();
    } catch {
      setError(t("errorSavingTask"));
    } finally {
      saving.current = false;
    }
  }
  const categoryOptions = categories.data ?? [];
  const projectOptions = (projects.data ?? []).filter(
    (project) =>
      project.status === "active" || project._id === original.projectId,
  );
  return (
    <V2Dialog
      open
      title={t(task ? "editTask" : "newTask")}
      onClose={close}
      className="v2-task-editor"
    >
      {dataRouter && <NavigationGuard dirty={dirty} pending={pending} />}
      <form
        className="v2-task-form grid gap-[18px]"
        onSubmit={submit}
        noValidate
      >
        {choicesLoading && <p role="status">{t("loadingChoices")}</p>}
        {choicesFailed && (
          <div role="alert">
            {t("errorLoadingChoices")}{" "}
            <button
              className="v2-btn"
              type="button"
              onClick={() => {
                void categories.refetch();
                void projects.refetch();
              }}
            >
              {t("retry")}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="v2-form-error text-[13px]">
            {error}
          </p>
        )}
        <fieldset
          disabled={pending}
          className="v2-form-fields grid gap-[8px] min-w-[0] [&_>_label:not(:first-child)]:mt-[10px]"
        >
          <label htmlFor={`${id}-title`}>{t("title")}</label>
          <input
            id={`${id}-title`}
            className="v2-input [&:focus]:[outline:2px_solid_var(--v2-accent)] [&:focus]:outline-offset-[2px]"
            value={draft.title}
            onChange={(e) => change("title", e.target.value)}
            required
            aria-required="true"
          />
          <label htmlFor={`${id}-description`}>{t("description")}</label>
          <textarea
            id={`${id}-description`}
            className="v2-input [&:focus]:[outline:2px_solid_var(--v2-accent)] [&:focus]:outline-offset-[2px]"
            rows={3}
            value={draft.description}
            onChange={(e) => change("description", e.target.value)}
          />
          <div className="v2-form-grid grid grid-cols-[1fr_1fr] gap-[16px] mt-[10px] [@media(max-width:767px)]:grid-cols-[1fr]">
            <div className="v2-form-field grid [align-content:start] gap-[8px] min-w-[0]">
              <label htmlFor={`${id}-priority`}>{t("priority")}</label>
              <CustomSelect
                id={`${id}-priority`}
                value={draft.priority}
                onChange={(e) => change("priority", e.target.value)}
              >
                {(["Low", "Medium", "High"] as const).map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`priority${priority}`)}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div className="v2-form-field grid [align-content:start] gap-[8px] min-w-[0]">
              <label htmlFor={`${id}-category`}>{t("category")}</label>
              <CustomSelect
                id={`${id}-category`}
                value={draft.categoryId}
                onChange={(e) => change("categoryId", e.target.value)}
                disabled={choicesLoading || choicesFailed}
              >
                <option value="">{t("defaultCategory")}</option>
                {original.categoryId &&
                  !categoryOptions.some(
                    (category) => category._id === original.categoryId,
                  ) && (
                    <option value={original.categoryId}>
                      {typeof task?.categoryId === "object" && task.categoryId
                        ? task.categoryId.name
                        : t("currentCategory")}
                    </option>
                  )}
                {categoryOptions.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div className="v2-form-field grid [align-content:start] gap-[8px] min-w-[0]">
              <label htmlFor={`${id}-project`}>{t("project")}</label>
              <CustomSelect
                id={`${id}-project`}
                value={draft.projectId}
                onChange={(e) => change("projectId", e.target.value)}
                disabled={choicesLoading || choicesFailed}
              >
                <option value="">{t("noProject")}</option>
                {original.projectId &&
                  !projectOptions.some(
                    (project) => project._id === original.projectId,
                  ) && (
                    <option value={original.projectId}>
                      {typeof task?.projectId === "object" && task.projectId
                        ? task.projectId.name
                        : t("currentProject")}
                    </option>
                  )}
                {projectOptions.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </CustomSelect>
            </div>
            {(["startDate", "dueDate"] as const).map((key) => (
              <div
                className="v2-form-field grid [align-content:start] gap-[8px] min-w-[0]"
                key={key}
              >
                <label htmlFor={`${id}-${key}`}>{t(key)}</label>
                <input
                  id={`${id}-${key}`}
                  className="v2-input [&:focus]:[outline:2px_solid_var(--v2-accent)] [&:focus]:outline-offset-[2px]"
                  type="datetime-local"
                  value={draft[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </fieldset>
        {discard && (
          <div
            className="v2-discard-confirmation p-[16px] [border:1px_solid_var(--v2-border)] rounded-[14px] [background:var(--v2-input-fill)] [&_p]:mb-[12px] [&_p]:text-[13px] [&_button]:mr-[8px]"
            role="alert"
          >
            <p>{t("discardPrompt")}</p>
            <button
              type="button"
              className="v2-btn"
              onClick={() => setDiscard(false)}
              disabled={pending}
            >
              {t("keepEditing")}
            </button>
            <button
              type="button"
              className="v2-btn"
              onClick={() => {
                if (!saving.current) onCancel();
              }}
              disabled={pending}
            >
              {t("discardChanges")}
            </button>
          </div>
        )}
        <div className="v2-form-actions flex justify-end flex-wrap gap-[10px] [border-top:1px_solid_var(--v2-border)] pt-[18px]">
          <button
            type="button"
            className="v2-btn"
            onClick={close}
            disabled={pending}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)]"
            disabled={pending || choicesLoading || choicesFailed}
          >
            {t(pending ? "saving" : task ? "saveChanges" : "createTask")}
          </button>
        </div>
      </form>
    </V2Dialog>
  );
}
