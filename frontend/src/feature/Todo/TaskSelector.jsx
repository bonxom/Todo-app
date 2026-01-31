const TaskSelector = ({ selectedStatus, onStatusChange }) => {
  const handleAllClick = () => {
    const allSelected = selectedStatus.length === 4 && 
      selectedStatus.includes('pending') && 
      selectedStatus.includes('in-progress') && 
      selectedStatus.includes('completed') && 
      selectedStatus.includes('given-up');
    
    if (allSelected) {
      onStatusChange([]);
    } else {
      onStatusChange(['pending', 'in-progress', 'completed', 'given-up']);
    }
  };

  const handleStatusToggle = (status) => {
    if (selectedStatus.includes(status)) {
      onStatusChange(selectedStatus.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatus, status]);
    }
  };

  const isAllSelected = selectedStatus.length === 4 && 
    selectedStatus.includes('pending') && 
    selectedStatus.includes('in-progress') && 
    selectedStatus.includes('completed') && 
    selectedStatus.includes('given-up');

  return (
    <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
      <button
        onClick={handleAllClick}
        className={`px-6 py-2 rounded-full font-medium transition-all ${
          isAllSelected
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
            : 'bg-white/80 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        All
      </button>
      <button
        onClick={() => handleStatusToggle('pending')}
        className={`px-6 py-2 rounded-full font-medium transition-all ${
          selectedStatus.includes('pending')
            ? 'bg-gray-200 text-gray-700 border-2 border-gray-400 shadow-sm'
            : 'bg-white/80 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        Pending Tasks
      </button>
      <button
        onClick={() => handleStatusToggle('in-progress')}
        className={`px-6 py-2 rounded-full font-medium transition-all ${
          selectedStatus.includes('in-progress')
            ? 'bg-gray-200 text-gray-700 border-2 border-gray-400 shadow-sm'
            : 'bg-white/80 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        In Progress Tasks
      </button>
      <button
        onClick={() => handleStatusToggle('completed')}
        className={`px-6 py-2 rounded-full font-medium transition-all ${
          selectedStatus.includes('completed')
            ? 'bg-gray-200 text-gray-700 border-2 border-gray-400 shadow-sm'
            : 'bg-white/80 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        Completed Tasks
      </button>
      <button
        onClick={() => handleStatusToggle('given-up')}
        className={`px-6 py-2 rounded-full font-medium transition-all ${
          selectedStatus.includes('given-up')
            ? 'bg-gray-200 text-gray-700 border-2 border-gray-400 shadow-sm'
            : 'bg-white/80 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        Given Up Tasks
      </button>
    </div>
  );
};

export default TaskSelector;
