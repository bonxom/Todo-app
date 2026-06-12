import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div 
        className="relative max-h-[90vh] w-full max-w-xl animate-fadeIn overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <div className="sticky top-0 bg-white rounded-t-2xl p-6 pb-4 border-b border-gray-100 z-10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 id="task-detail-title" className="text-2xl font-bold text-gray-900 pr-10">Edit Task</h2>
        </div>

        <div className="px-6 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
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
