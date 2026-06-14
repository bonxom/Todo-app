const STAT_STYLES = {
  neutral: 'text-[color:var(--color-text)]',
  accent: 'text-[color:var(--color-accent)]',
  success: 'text-[color:var(--color-success)]',
  warning: 'text-[color:var(--color-warning)]',
};

const CategoryStats = ({ stats, entityLabel = 'Categories' }) => {
  const items = [
    {
      id: 'groups',
      label: entityLabel,
      value: stats.totalGroups,
      tone: 'accent',
    },
    {
      id: 'tasks',
      label: 'Visible Tasks',
      value: stats.totalTasks,
      tone: 'neutral',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats.completedTasks,
      tone: 'success',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: stats.pendingTasks,
      tone: 'warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <section key={item.id} className="ui-section-card p-4">
          <p className="text-xs font-medium text-[color:var(--color-text-muted)]">{item.label}</p>
          <p className={`ui-tabular mt-2 text-2xl font-semibold ${STAT_STYLES[item.tone]}`}>
            {item.value}
          </p>
        </section>
      ))}
    </div>
  );
};

export default CategoryStats;
