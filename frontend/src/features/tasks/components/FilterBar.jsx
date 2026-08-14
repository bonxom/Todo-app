const FilterBar = ({
  selectedStatus,
  onStatusChange,
}) => {
  const statusOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'pending', label: 'Pending Tasks' },
    { value: 'in-progress', label: 'In Progress Tasks' },
    { value: 'completed', label: 'Completed Tasks' },
    { value: 'given-up', label: 'Given Up Tasks' },
  ];

  return (
    <div className="relative">
      <select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filter by status"
        className="
          peer
          h-12
          min-w-[200px]
          appearance-none
          rounded-2xl
          border border-gray-200 bg-white/80
          !pl-11 pr-10
          text-[15px]
          text-gray-900
          shadow-sm
          outline-none transition
          hover:border-gray-300
          focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60
        "
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Left icon */}
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
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>

      {/* Dropdown chevron */}
      <svg
        className="
          pointer-events-none
          absolute right-4 top-1/2 -translate-y-1/2
          h-5 w-5
          text-gray-400
        "
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
};

export default FilterBar;
