import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { useUpdateProfileMutation } from "../api/userMutations";
import { getApiErrorMessage } from "@/shared/services/apiError";

const AvatarUpload = ({ onUploadSuccess }) => {
  const { t } = useTranslation("account");
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const updateProfileMutation = useUpdateProfileMutation();
  const isUploading = updateProfileMutation.isPending;

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

  const handleClose = () => {
    setIsOpen(false);
    setAvatarUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!avatarUrl.trim()) return;

    try {
      await updateProfileMutation.mutateAsync({ avatarUrl });
      alert(t("avatarUpdatedSuccessfully"));
      handleClose();
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert(
        t("errorUpdatingAvatar") +
          getApiErrorMessage(error, t("avatarUpdateFailed")),
      );
    }
  };

  const handleButtonClick = () => {
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        className="ui-focus-ring absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)]"
        style={{
          borderColor: "var(--color-line)",
          backgroundColor: "var(--color-surface)",
          boxShadow: "var(--shadow-xs)",
        }}
        aria-label={t("updateAvatarImage")}
        title={t("updateAvatarImage")}
      >
        <Camera size={20} />
      </button>

      {isOpen && (
        <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
          <div
            className="ui-modal-shell animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-upload-title"
          >
            <div className="ui-modal-header flex items-center justify-between gap-4">
              <div>
                <h3
                  id="avatar-upload-title"
                  className="m-0 text-xl font-semibold text-[var(--color-text)]"
                >
                  {t("updateAvatar")}
                </h3>
                <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
                  {t("pasteADirectImageUrlForYourAccountPhoto")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="ui-modal-close-button ui-focus-ring"
                aria-label={t("closeAvatarDialog")}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ui-modal-body">
                <label
                  htmlFor="avatar-url"
                  className="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                  {t("avatarUrl")}
                </label>
                <input
                  id="avatar-url"
                  name="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  autoComplete="url"
                  spellCheck={false}
                  placeholder={t("avatarUrlPlaceholder")}
                  className="ui-input"
                  disabled={isUploading}
                />
              </div>

              <div className="ui-modal-footer">
                <button
                  type="button"
                  onClick={handleClose}
                  className="ui-btn-secondary ui-focus-ring min-w-[8.5rem] flex-1"
                  disabled={isUploading}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ui-btn-primary ui-focus-ring min-w-[8.5rem] flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploading}
                >
                  {isUploading ? t("updating") : t("updateAvatar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AvatarUpload;
