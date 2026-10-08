import { CheckCheck, Layers, ListTodo } from "lucide-react";

const CategoryStats = ({ stats, entityLabel = "Categories" }) => {
  const rate = stats.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  return (
    <section className="category-overview" aria-label="Workspace overview">
      <div className="category-overview-intro">
        <span className="category-eyebrow">THE BIG PICTURE</span>
        <h2>
          Small steps. <br />
          Meaningful progress.
        </h2>
        <p>Your {entityLabel.toLowerCase()}, at a glance.</p>
      </div>
      <div className="category-metrics">
        {[
          { label: entityLabel, value: stats.totalGroups, Icon: Layers },
          { label: "Visible tasks", value: stats.totalTasks, Icon: ListTodo },
          { label: "Completed", value: stats.completedTasks, Icon: CheckCheck },
        ].map((item) => {
          const { label, value, Icon } = item;
          return (
            <div className="category-metric" key={label}>
              <Icon size={18} />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="category-overall-progress">
        <div
          className="category-progress-ring"
          style={{ "--progress": `${rate}%` }}
        >
          <span>
            {rate}
            <small>%</small>
          </span>
        </div>
        <div>
          <strong>
            {stats.totalTasks && rate === 100
              ? "All caught up"
              : "Making room for progress"}
          </strong>
          <p>
            {stats.totalTasks
              ? `${stats.totalTasks - stats.completedTasks} visible tasks not yet completed`
              : "Your next chapter starts with a task"}
          </p>
        </div>
      </div>
    </section>
  );
};
export default CategoryStats;
