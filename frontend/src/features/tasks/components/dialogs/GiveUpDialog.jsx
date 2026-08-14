const GiveUpDialog = ({ isOpen, onClose, onConfirm }) => {
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
        aria-labelledby="giveup-task-title"
      >
        <div className="ui-modal-header">
          <h2 id="giveup-task-title" className="text-xl font-semibold text-[var(--color-text)]">Give Up Task</h2>
        </div>
        <div className="ui-modal-body">
          <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
            Are you sure you want to give up this task? You are choosing not to continue working on it.
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
              className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-white transition-[background-color,border-color] duration-150 hover:opacity-90"
            >
              Give Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiveUpDialog;
