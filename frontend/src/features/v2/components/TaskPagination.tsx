import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TaskPaginationProps {
  pageNo: number;
  totalPage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function TaskPagination({
  pageNo,
  totalPage,
  onPageChange,
  disabled = false,
}: TaskPaginationProps) {
  const { t } = useTranslation("v2");

  if (totalPage <= 1) {
    return null;
  }

  const canPrev = pageNo > 1 && !disabled;
  const canNext = pageNo < totalPage && !disabled;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between pt-4 border-t border-[var(--v2-border)]"
    >
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange(pageNo - 1)}
        className="v2-btn text-xs py-1.5 px-3 min-h-0"
        aria-label={t("previous")}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span>{t("previous")}</span>
      </button>

      <span className="text-xs font-medium text-[var(--v2-muted)] tabular-nums">
        {t("pageOf", { current: pageNo, total: totalPage })}
      </span>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange(pageNo + 1)}
        className="v2-btn text-xs py-1.5 px-3 min-h-0"
        aria-label={t("next")}
      >
        <span>{t("next")}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
