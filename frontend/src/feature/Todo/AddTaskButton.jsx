import { useEffect } from 'react';
import { X } from 'lucide-react';
import AddTaskForm from './Form/AddTaskForm';

const AddTaskButton = ({ isOpen, onClose, onTaskCreated, onProjectCreated, initialProjectId = '' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div 
        className="ui-modal-shell w-full max-w-xl animate-fadeIn"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-title"
      >
        <div className="ui-modal-header flex items-start justify-between gap-4">
          <h2 id="add-task-title" className="text-xl font-semibold text-[var(--color-text)]">Add New Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal-close-button"
            aria-label="Close add task dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ui-modal-body overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <AddTaskForm
            onClose={onClose}
            onTaskCreated={onTaskCreated}
            onProjectCreated={onProjectCreated}
            initialProjectId={initialProjectId}
          />
        </div>
      </div>
    </div>
  );
};

export default AddTaskButton;
