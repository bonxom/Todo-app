import { useTranslation } from "react-i18next";
const DeleteDialog = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation("workspace");

  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay [background:var(--color-overlay)] fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-modal-shell overflow-hidden [border:1px_solid_rgba(31,35,40,0.06)] rounded-[var(--radius-2xl)]
          [background:var(--color-surface)] [box-shadow:var(--shadow-lg)] w-full max-w-md animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
      >
        <div className="ui-modal-header p-[1rem_1.25rem] [border-bottom:1px_solid_var(--color-line)] [background:var(--color-surface)]">
          <h2
            id="delete-task-title"
            className="text-xl font-semibold text-[var(--color-text)]"
          >
            {t("deleteTask")}
          </h2>
        </div>
        <div className="ui-modal-body p-[1.25rem]">
          <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
            {t("areYouSureYouWantToDeleteThisTaskThisActionCannotBeUndone")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary flex-1"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border
                border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold
                text-[var(--color-on-status,#fff)] transition-[background-color,border-color] duration-150 hover:opacity-90"
            >
              {t("delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteDialog;
