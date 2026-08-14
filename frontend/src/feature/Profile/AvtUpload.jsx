import { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useUpdateProfileMutation } from '../../features/profile/api/userMutations';
import { getApiErrorMessage } from '../../shared/services/apiError';

const AvatarUpload = ({ onUploadSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const updateProfileMutation = useUpdateProfileMutation();
  const isUploading = updateProfileMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setAvatarUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!avatarUrl.trim()) return;

    try {
      await updateProfileMutation.mutateAsync({ avatarUrl });
      alert('Avatar updated successfully!');
      handleClose();
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Error updating avatar: ' + getApiErrorMessage(error));
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
          borderColor: 'var(--color-line)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xs)',
        }}
        aria-label="Update avatar image"
        title="Update avatar image"
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
                <h3 id="avatar-upload-title" className="m-0 text-xl font-semibold text-[var(--color-text)]">
                  Update Avatar
                </h3>
                <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
                  Paste a direct image URL for your account photo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="ui-modal-close-button ui-focus-ring"
                aria-label="Close avatar dialog"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ui-modal-body">
                <label htmlFor="avatar-url" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  Avatar URL
                </label>
                <input
                  id="avatar-url"
                  name="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  autoComplete="url"
                  spellCheck={false}
                  placeholder="https://example.com/avatar.jpg…"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn-primary ui-focus-ring min-w-[8.5rem] flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploading}
                >
                  {isUploading ? 'Updating…' : 'Update Avatar'}
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
