const ProgressBar = ({
  completed,
  total,
  title = 'Progress',
  compact = false,
  accentClassName = 'from-blue-500 to-purple-600',
  emptyLabel = 'No tasks yet',
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`bg-white/80 rounded-2xl shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-gray-800`}>{title}</h3>
        <span className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-purple-600`}>{percentage}%</span>
      </div>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${compact ? 'h-2.5' : 'h-3'}`}>
        <div
          className={`h-full bg-gradient-to-r transition-all duration-300 ${accentClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={`text-gray-500 mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {total > 0 ? `${completed} completed · ${total} total tasks` : emptyLabel}
      </p>
    </div>
  );
};

export default ProgressBar;
