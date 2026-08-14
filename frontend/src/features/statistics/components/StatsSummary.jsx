const NUMBER_FORMATTER = new Intl.NumberFormat();

const SUMMARY_ITEMS = [
  {
    key: 'totalTasks',
    label: 'Total Tasks',
    tone: 'text-[color:var(--color-accent)]',
  },
  {
    key: 'completedTasks',
    label: 'Completed',
    tone: 'text-[color:var(--color-success)]',
  },
  {
    key: 'inProgressTasks',
    label: 'In Progress',
    tone: 'text-[color:var(--color-accent)]',
  },
  {
    key: 'pendingTasks',
    label: 'Pending',
    tone: 'text-[color:var(--color-warning)]',
  },
  {
    key: 'givenUpTasks',
    label: 'Given Up',
    tone: 'text-[color:var(--color-danger)]',
  },
];

const StatsSummary = ({ stats }) => {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {SUMMARY_ITEMS.map((item) => (
        <section key={item.key} className="ui-section-card p-4">
          <p className="text-xs font-medium text-[color:var(--color-text-muted)]">{item.label}</p>
          <p className={`ui-tabular mt-2 text-2xl font-semibold ${item.tone}`}>
            {NUMBER_FORMATTER.format(stats[item.key] || 0)}
          </p>
        </section>
      ))}
    </div>
  );
};

export default StatsSummary;
