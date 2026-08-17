/**
 * Pagination — Reusable pagination UI component.
 *
 * Displays:
 * - "Showing X–Y of Z results" info text
 * - Previous / page number buttons (with ellipsis) / Next
 * - Optional page size selector dropdown
 */

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pageNo: number;
  pageSize: number;
  totalCount: number;
  totalPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Build the page number array with ellipsis markers.
 * Always shows first, last, and a window around the current page.
 */
function buildPageNumbers(currentPage: number, totalPage: number): (number | 'ellipsis')[] {
  if (totalPage <= 7) {
    return Array.from({ length: totalPage }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPage - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPage - 2) {
    pages.push('ellipsis');
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
  className = '',
}: PaginationProps) {
  const pageNumbers = useMemo(
    () => buildPageNumbers(pageNo, totalPage),
    [pageNo, totalPage]
  );

  if (totalCount === 0) return null;

  const startItem = (pageNo - 1) * pageSize + 1;
  const endItem = Math.min(pageNo * pageSize, totalCount);
  const isFirstPage = pageNo <= 1;
  const isLastPage = pageNo >= totalPage;

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Info text */}
      <p className="text-sm text-[var(--color-text-muted)] tabular-nums">
        Showing{' '}
        <span className="font-semibold text-[var(--color-text)]">{startItem}</span>
        –
        <span className="font-semibold text-[var(--color-text)]">{endItem}</span>
        {' '}of{' '}
        <span className="font-semibold text-[var(--color-text)]">{totalCount}</span>
        {' '}results
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="pagination-page-size"
              className="text-xs text-[var(--color-text-muted)]"
            >
              Per page
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 text-xs text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {/* Previous */}
          <button
            type="button"
            onClick={() => onPageChange(pageNo - 1)}
            disabled={isFirstPage}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((page, index) =>
            page === 'ellipsis' ? (
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
                aria-label={`Page ${page}`}
                aria-current={page === pageNo ? 'page' : undefined}
                className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[var(--radius-sm)] border px-1.5 text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                  page === pageNo
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {page}
              </button>
            )
          )}

          {/* Next */}
          <button
            type="button"
            onClick={() => onPageChange(pageNo + 1)}
            disabled={isLastPage}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
