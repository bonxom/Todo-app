import { ChevronRight, Edit, Lock } from 'lucide-react';

const ProfileActions = ({ onEditProfile, onChangePassword }) => {
  const actions = [
    {
      label: 'Edit Profile',
      icon: Edit,
      onClick: onEditProfile,
      eyebrow: 'Profile',
      description: 'Update your name, email, birthday, and avatar details.',
    },
    {
      label: 'Change Password',
      icon: Lock,
      onClick: onChangePassword,
      eyebrow: 'Security',
      description: 'Replace the password you use to sign in to your workspace.',
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Settings Actions
        </h2>
        <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
          Use these quick actions to keep your account details current.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="ui-action-tile ui-focus-ring"
          >
            <span className="ui-action-tile__icon" aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <span className="ui-action-tile__copy">
              <span className="ui-action-tile__eyebrow">{action.eyebrow}</span>
              <span className="ui-action-tile__title">{action.label}</span>
              <span className="ui-action-tile__description">{action.description}</span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          </button>
        );
        })}
      </div>
    </section>
  );
};

export default ProfileActions;
