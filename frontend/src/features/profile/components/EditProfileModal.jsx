import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
  const { t } = useTranslation("account");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
    nationality: user?.nationality || "",
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay [background:var(--color-overlay)] fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
      <div
        className="ui-modal-shell overflow-hidden [border:1px_solid_rgba(31,35,40,0.06)] rounded-[var(--radius-2xl)] [background:var(--color-surface)] [box-shadow:var(--shadow-lg)] animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <div className="ui-modal-header p-[1rem_1.25rem] [border-bottom:1px_solid_var(--color-line)] [background:var(--color-surface)] flex items-center justify-between gap-4">
          <div>
            <h2
              id="edit-profile-title"
              className="m-0 text-xl font-semibold text-[var(--color-text)]"
            >
              {t("editProfile")}
            </h2>
            <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
              {t("updateTheDetailsShownAcrossYourAccount")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal-close-button inline-flex w-[2.5rem] h-[2.5rem] items-center justify-center
              [border:1px_solid_var(--color-line)] rounded-[var(--radius-md)] [background:var(--color-surface)]
              [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
              [&:hover]:border-[color-mix(_in_srgb,var(--color-line)_72%,var(--color-text-muted)_)]
              [&:hover]:[background:var(--color-surface-muted)] [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
            aria-label={t("closeEditProfileDialog")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ui-modal-body p-[1.25rem] space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-medium text-[var(--color-text)]"
              >
                {t("fullName")}
              </label>
              <input
                id="profile-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                autoComplete="name"
                className="ui-input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-medium text-[var(--color-text)]"
              >
                {t("email")}
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                autoComplete="email"
                spellCheck={false}
                className="ui-input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="profile-dob"
                className="mb-2 block text-sm font-medium text-[var(--color-text)]"
              >
                {t("birthday")}
              </label>
              <input
                id="profile-dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
                autoComplete="bday"
                className="ui-input"
              />
            </div>
          </div>

          <div className="ui-modal-footer flex flex-wrap gap-[0.75rem] p-[0_1.25rem_1.25rem]">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary ui-focus-ring min-w-[8.5rem] flex-1"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="ui-btn-primary ui-focus-ring min-w-[8.5rem] flex-1"
            >
              {t("saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
