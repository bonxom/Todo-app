import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import type { TaskStatus } from "@/shared/types/domain";

export interface TaskToolbarProps {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  status: TaskStatus | "";
  onStatusChange: (status: TaskStatus | "") => void;
}

export default function TaskToolbar({
  searchDraft,
  onSearchChange,
  onSubmitSearch,
  status,
  onStatusChange,
}: TaskToolbarProps) {
  const { t } = useTranslation("v2");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmitSearch();
  };

  return (
    <div className="v2-task-toolbar">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--v2-ink)] tracking-tight">
          {t("tasks")}
        </h2>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
        {/* Search form */}
        <form
          onSubmit={handleSubmit}
          className="relative flex-1 sm:w-64"
          role="search"
        >
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="v2-input v2-search-input w-full"
          />
          <button
            type="submit"
            aria-label={t("search")}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--v2-muted)] hover:text-[var(--v2-ink)] p-0.5"
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </form>

        {/* Status filter */}
        <div className="w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus | "")}
            aria-label={t("filterByStatus")}
            className="v2-select w-full sm:w-auto text-sm cursor-pointer"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="in-progress">{t("inProgress")}</option>
            <option value="completed">{t("completed")}</option>
            <option value="given-up">{t("givenUp")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
