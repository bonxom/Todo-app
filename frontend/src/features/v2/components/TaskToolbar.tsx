import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";
import type { TaskStatus } from "@/shared/types/domain";

export interface TaskToolbarProps {
  onCreate: () => void;
  searchDraft: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  status: TaskStatus | "";
  onStatusChange: (status: TaskStatus | "") => void;
}

export default function TaskToolbar({
  onCreate,
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
    <div className="v2-task-toolbar flex justify-between [border-bottom:1px_solid_var(--v2-border)] flex-wrap [&_h2]:text-[16px] [&_h2]:[font-weight:600]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--v2-ink)] tracking-tight">
          {t("tasks")}
        </h2>
      </div>

      <div className="v2-task-tools flex min-w-[0] [@container_workspace_(max-width:850px)]:flex-wrap">
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
            className="v2-input [&:focus]:[outline:2px_solid_var(--v2-accent)] [&:focus]:outline-offset-[2px] v2-search-input w-full"
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
        <div className="w-full sm:w-auto sm:min-w-[152px]">
          <CustomSelect
            value={status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus | "")}
            aria-label={t("filterByStatus")}
            className="v2-select"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="in-progress">{t("inProgress")}</option>
            <option value="completed">{t("completed")}</option>
            <option value="given-up">{t("givenUp")}</option>
          </CustomSelect>
        </div>
        <button
          type="button"
          className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)] v2-create-task whitespace-nowrap [@media(max-width:359px)]:w-full"
          onClick={onCreate}
        >
          <Plus size={17} aria-hidden="true" />
          {t("newTask")}
        </button>
      </div>
    </div>
  );
}
