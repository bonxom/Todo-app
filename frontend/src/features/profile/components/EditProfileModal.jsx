import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    nationality: user?.nationality || '',
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
      <div
        className="ui-modal-shell animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <div className="ui-modal-header flex items-center justify-between gap-4">
          <div>
            <h2 id="edit-profile-title" className="m-0 text-xl font-semibold text-[var(--color-text)]">
              Edit Profile
            </h2>
            <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
              Update the details shown across your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal-close-button ui-focus-ring"
            aria-label="Close edit profile dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ui-modal-body space-y-4">
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Full Name
              </label>
              <input
                id="profile-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoComplete="name"
                className="ui-input"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Email
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                spellCheck={false}
                className="ui-input"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-dob" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Birthday
              </label>
              <input
                id="profile-dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                autoComplete="bday"
                className="ui-input"
              />
            </div>
          </div>

          <div className="ui-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary ui-focus-ring min-w-[8.5rem] flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-btn-primary ui-focus-ring min-w-[8.5rem] flex-1"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
