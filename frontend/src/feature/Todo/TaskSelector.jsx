const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'given-up', label: 'Given Up' },
];

const TaskSelector = ({ selectedStatus, onStatusChange }) => {
  const isAllSelected = selectedStatus.length === 4 && 
    selectedStatus.includes('pending') && 
    selectedStatus.includes('in-progress') && 
    selectedStatus.includes('completed') && 
    selectedStatus.includes('given-up');

  const handleToggle = (id) => {
    if (id === 'all') {
      onStatusChange(isAllSelected ? [] : ['pending', 'in-progress', 'completed', 'given-up']);
      return;
    }

    if (selectedStatus.includes(id)) {
      onStatusChange(selectedStatus.filter(s => s !== id));
    } else {
      onStatusChange([...selectedStatus, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
      {STATUS_OPTIONS.map((option) => {
        const isSelected = option.id === 'all' ? isAllSelected : selectedStatus.includes(option.id);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleToggle(option.id)}
            className={`inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,color] duration-150 ${
              isSelected
                ? 'border-transparent bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
            }`}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default TaskSelector;
