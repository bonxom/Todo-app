const birthdayFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const memberSinceFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const formatDateOnly = (value) => {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : birthdayFormatter.format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : memberSinceFormatter.format(date);
};

const formatRoleLabel = (value) => {
  if (!value) {
    return 'User';
  }

  return value
    .toLowerCase()
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const ProfileInfo = ({ user }) => {
  const fields = [
    {
      label: 'Full Name',
      value: user?.name || 'Not set',
    },
    {
      label: 'Email',
      value: user?.email || 'Not set',
    },
    {
      label: 'Role',
      value: formatRoleLabel(user?.role),
    },
    {
      label: 'Birthday',
      value: formatDateOnly(user?.dob),
    },
    {
      label: 'Member Since',
      value: formatDateTime(user?.createdAt),
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Personal Information
        </h2>
        <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
          These details are used across your workspace and account screens.
        </p>
      </div>

      <div>
        {fields.map((field) => (
          <div key={field.label} className="ui-detail-row">
            <span className="ui-detail-row__label">{field.label}</span>
            <span className="ui-detail-row__value">{field.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProfileInfo;
