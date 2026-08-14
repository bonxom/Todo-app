import { Plus, FolderPlus, Layers } from 'lucide-react';

const ActionButtons = ({ onAddTask, onAddCategory, onAddProject }) => {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onAddTask}
        className="ui-btn-primary flex-1 sm:flex-none"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Add Task</span>
      </button>

      <button
        type="button"
        onClick={onAddCategory}
        className="ui-btn-secondary flex-1 sm:flex-none"
      >
        <Layers className="h-4 w-4" aria-hidden="true" />
        <span>Add Category</span>
      </button>

      <button
        type="button"
        onClick={onAddProject}
        className="ui-btn-secondary flex-1 sm:flex-none"
      >
        <FolderPlus className="h-4 w-4" aria-hidden="true" />
        <span>Add Project</span>
      </button>
    </div>
  );
};

export default ActionButtons;
