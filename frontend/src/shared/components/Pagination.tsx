import { useTranslation } from "react-i18next";
/**
 * Pagination — Reusable pagination UI component.
 *
 * Displays:
 * - "Showing X–Y of Z results" info text
 * - Previous / page number buttons (with ellipsis) / Next
 * - Optional page size selector dropdown
 */

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CustomSelect from "./CustomSelect";

interface PaginationProps {
  pageNo: number;
  pageSize: number;
  totalCount: number;
  totalPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  compact?: boolean;
}

/**
 * Build the page number array with ellipsis markers.
 * Always shows first, last, and a window around the current page.
 */
function buildPageNumbers(
  currentPage: number,
  totalPage: number,
): (number | "ellipsis")[] {
  if (totalPage <= 7) {
    return Array.from({ length: totalPage }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPage - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPage - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPage);
  return pages;
}

export default function Pagination({
  pageNo,
  pageSize,
  totalCount,
  totalPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = "",
  compact = false,
}: PaginationProps) {
  const { t } = useTranslation("common");
  const pageNumbers = useMemo(
    () => buildPageNumbers(pageNo, totalPage),
    [pageNo, totalPage],
  );

  if (totalCount === 0) return null;

  const startItem = (pageNo - 1) * pageSize + 1;
  const endItem = Math.min(pageNo * pageSize, totalCount);
  const isFirstPage = pageNo <= 1;
  const isLastPage = pageNo >= totalPage;

  return (
    <div
      className={`flex flex-col gap-3 ${
        compact ? "" : "sm:flex-row sm:items-center sm:justify-between"
      } ${className}`}
      role="navigation"
      aria-label={t("pagination.label")}
    >
      {/* Info text */}
      <p className="text-sm text-[var(--color-text-muted)] tabular-nums">
        {t("pagination.summary", {
          start: startItem,
          end: endItem,
          total: totalCount,
        })}
      </p>

      <div
        className={`flex gap-3 ${compact ? "flex-col items-stretch" : "items-center"}`}
      >
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="pagination-page-size"
              className="text-xs text-[var(--color-text-muted)]"
            >
              {t("pagination.perPage")}
            </label>
            <CustomSelect
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              wrapperClassName="ui-custom-select--inline"
              className="!min-h-8 h-8 !w-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] !px-2.5 !py-1 text-xs text-[var(--color-text)] cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </CustomSelect>
          </div>
        )}

        {/* Page buttons */}
        <div
          className={`flex items-center gap-1 ${compact ? "justify-end overflow-x-auto pb-0.5" : ""}`}
        >
          {/* Previous */}
          <button
            type="button"
            onClick={() => onPageChange(pageNo - 1)}
            disabled={isFirstPage}
            aria-label={t("pagination.previous")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 w-8 items-center justify-center text-xs text-[var(--color-text-muted)]"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                disabled={page === pageNo}
                aria-label={t("pagination.page", { page })}
                aria-current={page === pageNo ? "page" : undefined}
                className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[var(--radius-sm)] border px-1.5 text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                  page === pageNo
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-status,#fff)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                {page}
              </button>
            ),
          )}

          {/* Next */}
          <button
            type="button"
            onClick={() => onPageChange(pageNo + 1)}
            disabled={isLastPage}
            aria-label={t("pagination.next")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
