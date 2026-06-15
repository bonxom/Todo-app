const NotInProgressDialog = ({ isOpen, onClose }) => {
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
        aria-labelledby="not-in-progress-title"
      >
        <div className="ui-modal-header">
          <h2 id="not-in-progress-title" className="text-xl font-semibold text-[var(--color-text)]">Task Not In Progress</h2>
        </div>
        <div className="ui-modal-body">
          <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
            This task must be in progress before you can mark it as completed.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-primary"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotInProgressDialog;
