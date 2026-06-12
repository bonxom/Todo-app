const ActionButtons = ({ onAddTask, onAddCategory, onAddProject }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        type="button"
        onClick={onAddTask}
        className="flex-1 sm:flex-none h-12 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Task</span>
      </button>

      <button
        type="button"
        onClick={onAddCategory}
        className="flex-1 sm:flex-none h-12 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span>Add Category</span>
      </button>

      <button
        type="button"
        onClick={onAddProject}
        className="flex-1 sm:flex-none h-12 px-6 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l2 2h10v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        <span>Add Project</span>
      </button>
    </div>
  );
};

export default ActionButtons;
