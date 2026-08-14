const ProfileStats = ({ stats }) => {
  const statItems = [
    {
      label: 'Total Tasks',
      value: stats?.totalTasks || 0,
      tone: 'text-[var(--color-accent)]',
    },
    {
      label: 'Completed',
      value: stats?.completedTasks || 0,
      tone: 'text-[var(--color-success)]',
    },
    {
      label: 'In Progress',
      value: stats?.inProgressTasks || 0,
      tone: 'text-[var(--color-warning)]',
    },
    {
      label: 'Categories',
      value: stats?.totalCategories || 0,
      tone: 'text-[var(--color-text)]',
    },
  ];

  return (
    <section className="ui-section-card ui-card-padding">
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
          Workspace Snapshot
        </h2>
        <p className="mt-1 mb-0 text-sm text-[var(--color-text-muted)]">
          A quick view of your current task load and structure.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
        {statItems.map((item) => (
          <div key={item.label} className="ui-compact-stat">
            <span className="ui-compact-stat__label">{item.label}</span>
            <span className={`ui-compact-stat__value ui-tabular ${item.tone}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProfileStats;
