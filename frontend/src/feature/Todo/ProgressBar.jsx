const ProgressBar = ({
  completed,
  total,
  title = 'Progress',
  compact = false,
  emptyLabel = 'No tasks yet',
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`ui-section-card ${compact ? 'p-4' : 'ui-card-padding'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-[var(--color-text)]`}>{title}</h3>
        <span className={`${compact ? 'text-sm' : 'text-base'} ui-tabular font-semibold text-[var(--color-accent)]`}>{percentage}%</span>
      </div>
      <div
        className={`w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)] ${compact ? 'h-2' : 'h-2.5'}`}
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={`text-[var(--color-text-muted)] mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {total > 0 ? `${completed} completed · ${total} total tasks` : emptyLabel}
      </p>
    </div>
  );
};

export default ProgressBar;
