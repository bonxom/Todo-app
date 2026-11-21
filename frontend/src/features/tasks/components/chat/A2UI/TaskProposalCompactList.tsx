import { useTranslation } from "react-i18next";
import { AlertCircle, Calendar, FolderKanban, Pencil } from "lucide-react";
import type { ProposalItem } from "@/shared/types/A2UI/taskProposal";
import type { Category, Project } from "@/shared/types/domain";
import {
  formatProposalSchedule,
  resolveProjectName,
} from "./proposalFormatting";

export interface TaskProposalCompactListProps {
  items: ProposalItem[];
  selectedItemIds: string[];
  activeIndex: number;
  locked: boolean;
  terminal: boolean;
  choices: {
    categories: Category[];
    projects: Project[];
    loaded: boolean;
  };
  validation: string[];
  onToggleSelect: (id: string) => void;
  onSelectSlide: (index: number) => void;
  onEditSlide: (index: number) => void;
}

const PRIORITY_DOT = {
  High: "bg-[var(--color-danger,#b25547)]",
  Medium: "bg-[var(--v2-warning,var(--color-warning,#a46a2a))]",
  Low: "bg-[var(--v2-accent,var(--color-accent,#456b8c))]",
} as const;

export function TaskProposalCompactList({
  items,
  selectedItemIds,
  activeIndex,
  locked,
  terminal,
  choices,
  validation,
  onToggleSelect,
  onSelectSlide,
  onEditSlide,
}: TaskProposalCompactListProps) {
  const { t } = useTranslation("agent");
  const canEdit = !locked && !terminal;

  return (
    <div className="min-w-0 overflow-hidden rounded-[14px] border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] shadow-[var(--v2-shadow-sm,var(--shadow-xs))]">
      <div className="max-h-[300px] divide-y divide-[var(--v2-border,var(--color-line,#d9dee5))] overflow-y-auto">
        {items.map((item, index) => {
          const isSelected = selectedItemIds.includes(item.id);
          const isActive = index === activeIndex;
          const priority = item.priority ?? "Medium";
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
          const scheduleLabel = formatProposalSchedule(
            item.startDate,
            item.dueDate,
            t,
          );
          const itemError = !terminal ? validation[index] : "";

          return (
            <div
              key={item.id}
              data-selected={isSelected ? "true" : "false"}
              data-active={isActive ? "true" : "false"}
              className={`flex min-h-[44px] min-w-0 items-center gap-2 px-3 py-2 transition-colors duration-150 ${
                isActive
                  ? "bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_8%,transparent)]"
                  : "hover:bg-[color-mix(in_srgb,var(--v2-border,var(--color-line,#d9dee5))_28%,transparent)]"
              }`}
            >
              <label className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={locked}
                  aria-label={t("selectTask", { title: item.title })}
                  onChange={() => onToggleSelect(item.id)}
                  className="h-4 w-4 cursor-pointer rounded-[4px] accent-[var(--v2-accent,var(--color-accent,#456b8c))] disabled:cursor-default disabled:opacity-60"
                />
              </label>

              <button
                type="button"
                onClick={() => onSelectSlide(index)}
                className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-[8px] border-0 bg-transparent px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
              >
                <span
                  className={`block truncate text-[0.835rem] font-medium leading-[1.3] text-[var(--v2-ink,var(--color-text,#1f2328))] ${
                    isSelected ? "" : "line-through opacity-60"
                  }`}
                >
                  {item.title.trim() || t("proposalUntitledTask")}
                </span>
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] text-[var(--v2-muted,var(--color-text-muted,#667085))]">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`}
                      aria-hidden="true"
                    />
                    {priorityLabel}
                  </span>
                  {projectName && (
                    <span className="inline-flex max-w-[140px] items-center gap-1 truncate">
                      <FolderKanban
                        size={10}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{projectName}</span>
                    </span>
                  )}
                  {scheduleLabel && (
                    <span className="inline-flex max-w-[160px] items-center gap-1 truncate">
                      <Calendar
                        size={10}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{scheduleLabel}</span>
                    </span>
                  )}
                  {itemError && (
                    <span
                      className="inline-flex items-center gap-1 font-semibold text-[var(--color-danger,#b25547)]"
                      title={itemError}
                    >
                      <AlertCircle
                        size={11}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                      {t("proposalErrorCount", { count: 1 })}
                    </span>
                  )}
                </span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEditSlide(index)}
                  aria-label={t("proposalEditTask", { index: index + 1 })}
                  title={t("edit")}
                  className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-transparent bg-transparent !text-[var(--v2-muted,var(--color-text-muted,#667085))] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_12%,transparent)] hover:!text-[var(--v2-accent,var(--color-accent,#456b8c))] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
                >
                  <Pencil size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
