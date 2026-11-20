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
        className="ui-focus-ring absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border
          text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)]"
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
        <div className="ui-modal-overlay [background:var(--color-overlay)] fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
          <div
            className="ui-modal-shell overflow-hidden [border:1px_solid_rgba(31,35,40,0.06)] rounded-[var(--radius-2xl)] [background:var(--color-surface)] [box-shadow:var(--shadow-lg)] animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-upload-title"
          >
            <div className="ui-modal-header p-[1rem_1.25rem] [border-bottom:1px_solid_var(--color-line)] [background:var(--color-surface)] flex items-center justify-between gap-4">
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
                className="ui-modal-close-button inline-flex w-[2.5rem] h-[2.5rem] items-center justify-center
                  [border:1px_solid_var(--color-line)] rounded-[var(--radius-md)] [background:var(--color-surface)]
                  [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
                  [&:hover]:border-[color-mix(_in_srgb,var(--color-line)_72%,var(--color-text-muted)_)]
                  [&:hover]:[background:var(--color-surface-muted)] [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
                aria-label={t("closeAvatarDialog")}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ui-modal-body p-[1.25rem]">
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

              <div className="ui-modal-footer flex flex-wrap gap-[0.75rem] p-[0_1.25rem_1.25rem]">
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
