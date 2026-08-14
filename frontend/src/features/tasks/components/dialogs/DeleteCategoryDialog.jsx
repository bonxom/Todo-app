const DeleteCategoryDialog = ({ isOpen, onClose, onConfirm, categoryName }) => {
  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-modal-shell mx-4 w-full max-w-md animate-fadeIn"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
      >
        <div className="ui-modal-header">
          <h2 id="delete-category-title" className="text-xl font-semibold text-[color:var(--color-text)]">
            Delete Category
          </h2>
        </div>
        <div className="ui-modal-body">
          <p className="mb-6 text-sm leading-6 text-[color:var(--color-text-muted)]">
            Delete <span className="font-semibold text-[color:var(--color-text)]">“{categoryName}”</span>? This
            action cannot be undone.
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
              className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[10px] border border-[color:var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-white transition-[background-color,border-color] duration-150 hover:border-[color:var(--color-danger)] hover:bg-[var(--color-danger)]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCategoryDialog;
