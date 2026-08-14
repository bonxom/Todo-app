const SearchBar = ({
  searchTerm,
  onSearchChange,
  placeholder = "Search tasks\u2026",
}) => {
  const hasValue = (searchTerm ?? "").length > 0;

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tasks"
        className="ui-input peer w-full !pl-12 !pr-12"
      />

      {/* Search icon */}
      <svg
        className="
          pointer-events-none
          absolute left-4 top-1/2 -translate-y-1/2
          h-5 w-5
          text-[var(--color-text-muted)] transition-colors
          peer-focus-visible:text-[var(--color-accent)]
        "
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* Clear button */}
      {hasValue && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            inline-flex h-7 w-7 items-center justify-center
            rounded-[var(--radius-sm)]
            text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]
            transition-[background-color,color] duration-150
          "
          aria-label="Clear search"
          title="Clear"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
