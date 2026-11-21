import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Calendar,
  Check,
  FolderKanban,
  Pencil,
  Tag,
} from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";
import type { ProposalItem } from "@/shared/types/A2UI/taskProposal";
import type { Category, Project } from "@/shared/types/domain";
import {
  toDateTimeLocalValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import {
  formatProposalSchedule,
  resolveCategoryName,
  resolveProjectName,
} from "./proposalFormatting";

export interface TaskProposalSlideCardProps {
  item: ProposalItem;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  locked: boolean;
  terminal: boolean;
  choices: {
    categories: Category[];
    projects: Project[];
    loaded: boolean;
  };
  validationError: string;
  onToggleSelect: (id: string) => void;
  onStartEdit: (id: string) => void;
  onDoneEdit: () => void;
  onUpdateItem: (id: string, changes: Partial<ProposalItem>) => void;
  footer?: React.ReactNode;
}

const PRIORITY_STYLES = {
  High: {
    pill: "bg-[var(--color-danger-soft,#f9ecea)] text-[var(--color-danger,#b25547)]",
    dot: "bg-[var(--color-danger,#b25547)]",
  },
  Medium: {
    pill: "bg-[var(--color-warning-soft,#faf0df)] text-[var(--v2-warning,var(--color-warning,#a46a2a))]",
    dot: "bg-[var(--v2-warning,var(--color-warning,#a46a2a))]",
  },
  Low: {
    pill: "bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_13%,transparent)] text-[var(--v2-accent,var(--color-accent,#456b8c))]",
    dot: "bg-[var(--v2-accent,var(--color-accent,#456b8c))]",
  },
} as const;

const INPUT_CLASS =
  "box-border w-full min-w-0 rounded-[9px] border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-input-fill,var(--color-surface,#ffffff))] px-2.5 py-1.5 text-[0.8125rem] text-[var(--v2-ink,var(--color-text,#1f2328))] transition-[border-color,box-shadow] duration-150 focus:border-[var(--v2-accent,var(--color-accent,#456b8c))] focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_16%,transparent)] disabled:opacity-60";

const FIELD_LABEL_CLASS =
  "grid min-w-0 gap-1 text-[0.71rem] font-medium text-[var(--v2-muted,var(--color-text-muted,#667085))]";

export function TaskProposalSlideCard({
  item,
  index,
  isSelected,
  isEditing,
  locked,
  terminal,
  choices,
  validationError,
  onToggleSelect,
  onStartEdit,
  onDoneEdit,
  onUpdateItem,
  footer,
}: TaskProposalSlideCardProps) {
  const { t } = useTranslation("agent");
  const priority = item.priority ?? "Medium";
  const priorityStyle = PRIORITY_STYLES[priority];
  const priorityLabel =
    priority === "High"
      ? t("high")
      : priority === "Low"
        ? t("low")
        : t("medium");

  const projectName = resolveProjectName(
    item.projectId,
    choices.projects,
    t("currentProject"),
  );
  const categoryName = resolveCategoryName(
    item.categoryId,
    choices.categories,
    t("currentCategory"),
  );
  const scheduleLabel = formatProposalSchedule(item.startDate, item.dueDate, t);

  const canEdit = !locked && !terminal;
  const activeEdit = isEditing && !terminal;

  return (
    <div
      data-priority={priority}
      data-selected={isSelected ? "true" : "false"}
      data-editing={activeEdit ? "true" : "false"}
      className={`@container/proposal-card min-w-0 overflow-hidden rounded-[14px] border transition-[border-color,background-color,opacity,box-shadow] duration-150 ${
        activeEdit
          ? "border-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_52%,var(--v2-border,var(--color-line,#d9dee5)))] bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] shadow-[var(--v2-shadow-sm,var(--shadow-xs))]"
          : isSelected
            ? "border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] shadow-[var(--v2-shadow-sm,var(--shadow-xs))]"
            : "border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[color-mix(in_srgb,var(--v2-surface-solid,var(--color-surface-muted,#f1f3f5))_65%,transparent)] opacity-80"
      }`}
    >
      <div className="p-3 sm:p-3.5">
        {activeEdit ? (
          <fieldset
            disabled={locked}
            className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={locked}
                  aria-label={t("selectTask", { title: item.title })}
                  onChange={() => onToggleSelect(item.id)}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded-[4px] accent-[var(--v2-accent,var(--color-accent,#456b8c))]"
                />
                <legend className="m-0 p-0 text-[0.75rem] font-semibold tracking-[0.01em] text-[var(--v2-muted,var(--color-text-muted,#667085))]">
                  {t("proposalTaskLabel", { index: index + 1 })}
                </legend>
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={onDoneEdit}
                aria-label={t("proposalDoneEditing", { index: index + 1 })}
                title={t("proposalDone")}
                className="task-proposal-glass-btn relative inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--v2-glass-border,rgb(255_255_255_/_50%))_45%,transparent)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_86%,#ffffff),var(--v2-accent,var(--color-accent,#456b8c))_58%,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_88%,#000000))] !text-[var(--v2-accent-ink,var(--color-primary-text,#ffffff))] shadow-[inset_0_1px_0_rgb(255_255_255_/_46%),0_4px_12px_-5px_var(--v2-accent,var(--color-accent,#456b8c))] transition-[filter,transform,opacity] duration-150 hover:brightness-[1.06] active:translate-y-[1px] disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
              >
                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>

            <label className={FIELD_LABEL_CLASS}>
              <span>{t("title")}</span>
              <input
                aria-label={t("taskTitle", { index: index + 1 })}
                value={item.title}
                maxLength={200}
                onChange={(e) =>
                  onUpdateItem(item.id, { title: e.target.value })
                }
                className={`${INPUT_CLASS} font-medium`}
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              <span>{t("description")}</span>
              <textarea
                aria-label={t("taskDescription", { index: index + 1 })}
                value={item.description ?? ""}
                maxLength={1000}
                rows={2}
                onChange={(e) =>
                  onUpdateItem(item.id, { description: e.target.value })
                }
                className={`${INPUT_CLASS} resize-y`}
              />
            </label>

            <div className="grid grid-cols-1 gap-2 @[340px]/proposal-card:grid-cols-2">
              <label className={FIELD_LABEL_CLASS}>
                <span>{t("priority")}</span>
                <CustomSelect
                  disabled={locked}
                  aria-label={t("taskPriority", { index: index + 1 })}
                  value={priority}
                  onChange={(e) =>
                    onUpdateItem(item.id, {
                      priority: e.target.value as ProposalItem["priority"],
                    })
                  }
                >
                  <option value="Low">{t("low")}</option>
                  <option value="Medium">{t("medium")}</option>
                  <option value="High">{t("high")}</option>
                </CustomSelect>
              </label>

              <label className={FIELD_LABEL_CLASS}>
                <span>{t("category")}</span>
                <CustomSelect
                  disabled={locked}
                  aria-label={t("taskCategory", { index: index + 1 })}
                  value={item.categoryId ?? ""}
                  onChange={(e) =>
                    onUpdateItem(item.id, {
                      categoryId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">{t("uncategorized")}</option>
                  {item.categoryId &&
                    !choices.categories.some(
                      (category) => category._id === item.categoryId,
                    ) && (
                      <option value={item.categoryId}>
                        {t("currentCategory")}
                      </option>
                    )}
                  {choices.categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </CustomSelect>
              </label>

              <label
                className={`${FIELD_LABEL_CLASS} @[340px]/proposal-card:col-span-2`}
              >
                <span>{t("project")}</span>
                <CustomSelect
                  disabled={locked}
                  aria-label={t("taskProject", { index: index + 1 })}
                  value={item.projectId ?? ""}
                  onChange={(e) =>
                    onUpdateItem(item.id, { projectId: e.target.value || null })
                  }
                >
                  <option value="">{t("noProject")}</option>
                  {item.projectId &&
                    !choices.projects.some(
                      (project) => project._id === item.projectId,
                    ) && (
                      <option value={item.projectId}>
                        {t("currentProject")}
                      </option>
                    )}
                  {choices.projects.map((project) => (
                    <option
                      key={project._id}
                      value={project._id}
                      disabled={project.status === "completed"}
                    >
                      {project.name}
                      {project.status === "completed"
                        ? t("taskCompletedSuffix")
                        : ""}
                    </option>
                  ))}
                </CustomSelect>
              </label>

              {(["startDate", "dueDate"] as const).map((field) => (
                <label key={field} className={FIELD_LABEL_CLASS}>
                  <span>
                    {field === "startDate" ? t("start") : t("dueDate")}
                  </span>
                  <input
                    type="datetime-local"
                    aria-label={t(
                      field === "startDate" ? "taskStartDate" : "taskDueDate",
                      { index: index + 1 },
                    )}
                    value={toDateTimeLocalValue(item[field] ?? "")}
                    onChange={(e) =>
                      onUpdateItem(item.id, {
                        [field]: e.target.value
                          ? toISOStringLocal(e.target.value)
                          : null,
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <label className="mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={locked}
                  aria-label={t("selectTask", { title: item.title })}
                  onChange={() => onToggleSelect(item.id)}
                  className="h-4 w-4 cursor-pointer rounded-[4px] accent-[var(--v2-accent,var(--color-accent,#456b8c))] disabled:cursor-default disabled:opacity-60"
                />
              </label>

              <div className="min-w-0 flex-1">
                <h4
                  className={`m-0 text-[0.91rem] font-semibold leading-[1.35] tracking-[-0.012em] text-[var(--v2-ink,var(--color-text,#1f2328))] wrap-anywhere ${
                    isSelected ? "" : "line-through opacity-65"
                  }`}
                >
                  {item.title.trim() || t("proposalUntitledTask")}
                </h4>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onStartEdit(item.id)}
                  aria-label={t("proposalEditTask", { index: index + 1 })}
                  title={t("edit")}
                  className="-mt-1 -mr-1 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-transparent bg-transparent !text-[var(--v2-muted,var(--color-text-muted,#667085))] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_12%,transparent)] hover:!text-[var(--v2-accent,var(--color-accent,#456b8c))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
                >
                  <Pencil size={13.5} aria-hidden="true" />
                </button>
              )}
            </div>

            {item.description?.trim() && (
              <p className="m-0 line-clamp-3 pl-[1.85rem] text-[0.8rem] leading-[1.46] whitespace-pre-line text-[var(--v2-muted,var(--color-text-muted,#667085))] wrap-anywhere">
                {item.description.trim()}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pl-[1.85rem]">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.69rem] font-semibold ${priorityStyle.pill}`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityStyle.dot}`}
                  aria-hidden="true"
                />
                {priorityLabel}
              </span>

              {projectName && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] px-2 py-0.5 text-[0.69rem] font-medium text-[var(--v2-muted,var(--color-text-muted,#667085))]">
                  <FolderKanban
                    size={11}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{projectName}</span>
                </span>
              )}

              {categoryName && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] px-2 py-0.5 text-[0.69rem] font-medium text-[var(--v2-muted,var(--color-text-muted,#667085))]">
                  <Tag size={11} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{categoryName}</span>
                </span>
              )}

              {scheduleLabel && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] px-2 py-0.5 text-[0.69rem] font-medium text-[var(--v2-muted,var(--color-text-muted,#667085))]">
                  <Calendar size={11} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{scheduleLabel}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {!terminal && validationError && (
          <p
            role="alert"
            className="mt-2.5 mb-0 flex items-start gap-1.5 rounded-[10px] bg-[var(--color-danger-soft,#f9ecea)] px-2.5 py-2 text-[0.75rem] font-medium text-[var(--color-danger,#b25547)]"
          >
            <AlertCircle
              size={14}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{validationError}</span>
          </p>
        )}
      </div>

      {footer}
    </div>
  );
}
