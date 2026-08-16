import { RotateCcw, Search, X } from 'lucide-react';

const SORT_OPTIONS = [
  { id: 'dueDate', label: 'Due date (Earliest)' },
  { id: 'priority', label: 'Priority (High to Low)' },
  { id: 'title', label: 'Title (A-Z)' },
];

const TodoTaskToolbar = ({
  searchTerm,
  onSearchChange,
  sortBy = 'dueDate',
  onSortChange,
  activeProjectName,
  onClearProjectFilter,
}) => {
  const hasActiveFilters = Boolean(searchTerm.trim()) || Boolean(activeProjectName);

  return (
    <div className="space-y-3">
      {/* Main control row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Box */}
        <div className="relative min-w-[14rem] flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks…"
            className="ui-input h-10 !min-h-[2.5rem] !py-2 !pl-10 !pr-8 text-sm"
            aria-label="Search tasks"
          />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              aria-label="Clear search text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort tasks by"
          className="ui-input !w-auto h-10 !min-h-[2.5rem] !py-2 !pl-3 !pr-8 text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">Active filters:</span>

          {activeProjectName && (
            <span className="ui-chip ui-chip--accent">
              Project: {activeProjectName}
              <button
                type="button"
                onClick={onClearProjectFilter}
                className="ml-1 hover:text-[var(--color-danger)] cursor-pointer"
                aria-label="Remove project filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {searchTerm.trim() && (
            <span className="ui-chip">
              Keyword: "{searchTerm.trim()}"
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="ml-1 hover:text-[var(--color-danger)] cursor-pointer"
                aria-label="Remove search keyword"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onClearProjectFilter?.();
            }}
            className="ml-auto inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline font-semibold cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset all
          </button>
        </div>
      )}
    </div>
  );
};

export default TodoTaskToolbar;
