import { X } from 'lucide-react';
import AddTaskForm from '../Form/AddTaskForm';

const AddTaskModal = ({ isOpen, onClose, onTaskCreated, initialDueDate, initialProjectId = '' }) => {
  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-modal-shell w-full max-w-lg animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
      >
        <div className="ui-modal-header flex items-start justify-between gap-4">
          <h2 id="add-task-modal-title" className="text-xl font-semibold text-[var(--color-text)]">Add Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal-close-button"
            aria-label="Close add task dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="ui-modal-body">
          <AddTaskForm 
            onClose={onClose}
            onTaskCreated={onTaskCreated}
            initialDueDate={initialDueDate}
            initialProjectId={initialProjectId}
          />
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
