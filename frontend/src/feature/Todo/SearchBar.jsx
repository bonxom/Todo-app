const SearchBar = ({
  searchTerm,
  onSearchChange,
  placeholder = "Search tasks...",
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
        className="
          peer w-full
          h-12
          rounded-2xl
          border border-gray-200 bg-white/80
          !pl-12 pr-12
          text-[15px]
          text-gray-900 placeholder:text-gray-400
          shadow-sm
          outline-none transition
          hover:border-gray-300
          focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60
        "
      />

      {/* Search icon */}
      <svg
        className="
          pointer-events-none
          absolute left-4 top-1/2 -translate-y-1/2
          h-5 w-5
          text-gray-400 transition-colors
          peer-focus:text-purple-600
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
            p-1
            rounded-lg
            text-gray-400 hover:text-gray-700 hover:bg-gray-100
            transition
          "
          aria-label="Clear search"
          title="Clear"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
