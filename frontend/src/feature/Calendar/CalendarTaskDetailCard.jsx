import TaskCard from '../Category/TaskCard';

const formatLabel = (value) => {
  if (!value) return 'None';

  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDueDate = (value) => {
  if (!value) return 'No due date';

  const date = new Date(value);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const DetailRow = ({ label, value, tone = 'default' }) => {
  const toneClassName = tone === 'accent'
    ? 'text-sky-700'
    : tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-orange-700'
        : 'text-gray-700';

  return (
    <div className="rounded-xl bg-gray-50/90 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${toneClassName}`}>{value}</p>
    </div>
  );
};

const CalendarTaskDetailCard = ({
  task,
  mode = 'panel',
  onClick,
  onEdit,
  onGiveUp,
  onDelete,
  onTaskUpdated,
}) => {
  const projectName = task.projectId?.name || 'Standalone';
  const categoryName = task.categoryId?.name || 'Uncategorized';
  const priorityTone = task.priority === 'High' ? 'warning' : task.priority === 'Low' ? 'success' : 'accent';

  return (
    <div className="space-y-3 rounded-[1.6rem] border border-gray-100 bg-white/95 p-3 shadow-sm">
      <TaskCard
        task={task}
        onClick={mode === 'panel' ? onClick : undefined}
        quickActions={mode === 'panel'}
        showActions={mode === 'modal'}
        onEdit={onEdit}
        onGiveUp={onGiveUp}
        onDelete={onDelete}
        onTaskUpdated={onTaskUpdated}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <DetailRow label="Project" value={projectName} tone="accent" />
        <DetailRow label="Category" value={categoryName} />
        <DetailRow label="Priority" value={task.priority || 'Medium'} tone={priorityTone} />
        <DetailRow label="Status" value={formatLabel(task.status)} tone={task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'accent' : 'default'} />
        <div className="sm:col-span-2">
          <DetailRow label="Due date" value={formatDueDate(task.dueDate)} />
        </div>
      </div>
    </div>
  );
};

export default CalendarTaskDetailCard;
