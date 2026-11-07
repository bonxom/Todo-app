import { workspaceKey } from "@/features/tasks/utils/workspaceTranslation";
import { useTranslation } from "react-i18next";
import { RotateCcw, Search, X } from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";

const SORT_OPTIONS = [
  { id: "dueDate", label: "Due date (Earliest)" },
  { id: "priority", label: "Priority (High to Low)" },
  { id: "title", label: "Title (A-Z)" },
];

const TodoTaskToolbar = ({
  searchTerm,
  onSearchChange,
  sortBy = "dueDate",
  onSortChange,
  activeProjectName,
  onClearProjectFilter,
}) => {
  const { t } = useTranslation("workspace");

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || Boolean(activeProjectName);

  return (
    <div className="todo-toolbar space-y-3">
      {/* Main control row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Box */}
        <div className="relative min-w-[14rem] flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("searchTasksPlaceholder")}
            className="ui-input h-10 !min-h-[2.5rem] !py-2 !pl-10 !pr-8 text-sm"
            aria-label={t("searchTasks")}
          />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              aria-label={t("clearSearchText")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <CustomSelect
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label={t("sortTasksBy")}
          className="ui-input !w-auto h-10 !min-h-[2.5rem] !py-2 !pl-3 !pr-3 text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t(workspaceKey(opt.label), { defaultValue: opt.label })}
            </option>
          ))}
        </CustomSelect>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">
            {t("activeFilters")}
          </span>

          {activeProjectName && (
            <span className="ui-chip ui-chip--accent">
              {t("project")}
              {activeProjectName}
              <button
                type="button"
                onClick={onClearProjectFilter}
                className="ml-1 hover:text-[var(--color-danger)] cursor-pointer"
                aria-label={t("removeProjectFilter")}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {searchTerm.trim() && (
            <span className="ui-chip">
              {t("keyword")}
              {searchTerm.trim()}"
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="ml-1 hover:text-[var(--color-danger)] cursor-pointer"
                aria-label={t("removeSearchKeyword")}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onClearProjectFilter?.();
            }}
            className="ml-auto inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline font-semibold cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            {t("resetAll")}
          </button>
        </div>
      )}
    </div>
  );
};

export default TodoTaskToolbar;
