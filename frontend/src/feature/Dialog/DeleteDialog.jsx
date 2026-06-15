const DeleteDialog = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-modal-shell w-full max-w-md animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
      >
        <div className="ui-modal-header">
          <h2 id="delete-task-title" className="text-xl font-semibold text-[var(--color-text)]">Delete Task</h2>
        </div>
        <div className="ui-modal-body">
          <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-white transition-[background-color,border-color] duration-150 hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteDialog;
