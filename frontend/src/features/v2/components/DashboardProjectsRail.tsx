import { useTranslation } from "react-i18next";
import { FolderKanban, Plus } from "lucide-react";
import GlassPanel from "./GlassPanel";
import type { ProjectWithSummary } from "@/shared/types/domain";

export interface DashboardProjectsRailProps {
  projects?: ProjectWithSummary[];
  totalTasksCount?: number;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export default function DashboardProjectsRail({
  projects = [],
  totalTasksCount = 0,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: DashboardProjectsRailProps) {
  const { t } = useTranslation("v2");

  return (
    <GlassPanel
      as="aside"
      data-testid="v2-dashboard-projects-rail"
      aria-label={t("projectsRailTitle")}
      className="v2-projects-rail flex flex-col gap-3 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FolderKanban
            size={16}
            className="shrink-0 text-[var(--v2-accent)]"
            aria-hidden="true"
          />
          <h2 className="text-sm font-bold tracking-tight text-[var(--v2-ink)] truncate">
            {t("projectsRailTitle")}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCreateProject}
          aria-label={t("addProject")}
          title={t("addProject")}
          className="v2-btn min-h-[30px] px-2.5 py-1 text-xs font-semibold"
        >
          <Plus size={14} aria-hidden="true" />
          <span>{t("addProject")}</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-pressed={selectedProjectId === ""}
          onClick={() => onSelectProject("")}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
            selectedProjectId === ""
              ? "border-[var(--v2-accent)] bg-[var(--v2-input-fill)] text-[var(--v2-ink)]"
              : "border-[var(--v2-border)] bg-[var(--v2-shell-fill)] text-[var(--v2-muted)] hover:bg-[var(--v2-input-fill)] hover:text-[var(--v2-ink)]"
          }`}
        >
          <span className="truncate">{t("allProjects")}</span>
          <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--v2-accent)_14%,transparent)] px-2 py-0.5 text-[11px] text-[var(--v2-accent)]">
            {t("allProjectsTaskCount", { count: totalTasksCount })}
          </span>
        </button>

        {projects.length === 0 ? (
          <p className="px-1 py-2 text-xs text-[var(--v2-muted)]">
            {t("noProjectsYet")}
          </p>
        ) : (
          projects.map((project) => {
            const isSelected = selectedProjectId === project._id;
            const total = project.summary?.totalTasks ?? 0;
            const completed = project.summary?.completedTasks ?? 0;
            const rate =
              project.summary?.completionRate ??
              (total > 0 ? Math.round((completed / total) * 100) : 0);

            return (
              <button
                key={project._id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectProject(isSelected ? "" : project._id)}
                className={`flex w-full flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "border-[var(--v2-accent)] bg-[var(--v2-input-fill)]"
                    : "border-[var(--v2-border)] bg-[var(--v2-shell-fill)] hover:bg-[var(--v2-input-fill)]"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-[var(--v2-ink)]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: project.color || "var(--v2-accent)",
                      }}
                    />
                    <span className="truncate">{project.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-[var(--v2-muted)] tabular-nums">
                    {completed}/{total}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--v2-accent)_14%,transparent)]"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(Math.max(rate, 0), 100)}%`,
                      backgroundColor: project.color || "var(--v2-accent)",
                    }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </GlassPanel>
  );
}
