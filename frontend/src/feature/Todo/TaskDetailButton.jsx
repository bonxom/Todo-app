import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import TaskDetailForm from './Form/TaskDetailForm';

const TaskDetailButton = ({ isOpen, task, onClose, onTaskUpdated, onProjectCreated }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen || !task) return null;

  return createPortal(
    <div 
      className="ui-modal-overlay fixed inset-0 z-[80] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div 
        className="ui-modal-shell w-full max-w-xl animate-fadeIn"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <div className="ui-modal-header flex items-start justify-between gap-4">
          <h2 id="task-detail-title" className="text-xl font-semibold text-[var(--color-text)]">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal-close-button"
            aria-label="Close edit task dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ui-modal-body overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <TaskDetailForm
            task={task}
            onClose={onClose}
            onTaskUpdated={onTaskUpdated}
            onProjectCreated={onProjectCreated}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskDetailButton;
