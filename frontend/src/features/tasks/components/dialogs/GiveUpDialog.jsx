import { useTranslation } from "react-i18next";
const GiveUpDialog = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation("workspace");

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
          <h2
            id="giveup-task-title"
            className="text-xl font-semibold text-[var(--color-text)]"
          >
            {t("giveUpTask")}
          </h2>
        </div>
        <div className="ui-modal-body">
          <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
            {t(
              "areYouSureYouWantToGiveUpThisTaskYouAreChoosingNotToContinueWorkingOnIt",
            )}
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
              className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-[var(--color-on-status,#fff)] transition-[background-color,border-color] duration-150 hover:opacity-90"
            >
              {t("giveUp")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiveUpDialog;
