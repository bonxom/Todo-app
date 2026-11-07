import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";

const ChangePasswordModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation("account");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [formError, setFormError] = useState("");

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
    if (formData.newPassword !== formData.confirmPassword) {
      setFormError("confirmTheSameNewPasswordInBothFields");
      return;
    }

    setFormError("");
    onSave({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) {
      setFormError("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
      <div
        className="ui-modal-shell animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        <div className="ui-modal-header flex items-center justify-between gap-4">
          <div>
            <h2
              id="change-password-title"
              className="m-0 text-xl font-semibold text-[var(--color-text)]"
            >
              {t("changePassword")}
            </h2>
            <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
              {t("updateThePasswordYouUseToSignInToYourAccount")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal-close-button ui-focus-ring"
            aria-label={t("closeChangePasswordDialog")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ui-modal-body space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-[var(--color-text)]"
              >
                {t("currentPassword")}
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  name="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e) =>
                    updateField("currentPassword", e.target.value)
                  }
                  autoComplete="current-password"
                  className="ui-input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current")}
                  className="ui-focus-ring absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)]"
                  aria-label={
                    showPasswords.current
                      ? t("hideCurrentPassword")
                      : t("showCurrentPassword")
                  }
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-[var(--color-text)]"
              >
                {t("newPassword")}
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => updateField("newPassword", e.target.value)}
                  autoComplete="new-password"
                  className="ui-input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="ui-focus-ring absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)]"
                  aria-label={
                    showPasswords.new
                      ? t("hideNewPassword")
                      : t("showNewPassword")
                  }
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-[var(--color-text)]"
              >
                {t("confirmNewPassword")}
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  autoComplete="new-password"
                  className="ui-input pr-12"
                  aria-describedby={
                    formError ? "password-form-error" : undefined
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="ui-focus-ring absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)]"
                  aria-label={
                    showPasswords.confirm
                      ? t("hideConfirmNewPassword")
                      : t("showConfirmNewPassword")
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formError ? (
                <p
                  id="password-form-error"
                  className="mt-2 mb-0 text-sm text-[var(--color-danger)]"
                  aria-live="polite"
                >
                  {t(formError)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="ui-modal-footer">
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
              {t("changePassword")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
