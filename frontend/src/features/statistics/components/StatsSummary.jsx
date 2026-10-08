import { createElement } from "react";
import { Check, CircleDot, ListTodo, TrendingUp } from "lucide-react";

const number = new Intl.NumberFormat();
const StatsSummary = ({ stats }) => {
  if (!stats) return null;
  const rate = stats.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  return (
    <section
      className="statistics-overview"
      aria-label="All-time task overview"
    >
      <div className="statistics-intro">
        <p className="statistics-eyebrow">THE BIGGER PICTURE</p>
        <h2>
          Small efforts.
          <br />
          <em>Visible progress.</em>
        </h2>
        <p>A look at everything you’ve set in motion.</p>
        <span className="statistics-scope">All time</span>
      </div>
      <div className="statistics-metrics">
        {[
          {
            label: "Total tasks",
            value: stats.totalTasks,
            Icon: ListTodo,
            note: "Ideas put into action",
          },
          {
            label: "Completed",
            value: stats.completedTasks,
            Icon: Check,
            note: "Steps in the right direction",
          },
          {
            label: "In progress",
            value: stats.inProgressTasks,
            Icon: CircleDot,
            note: "Good things in motion",
          },
        ].map(({ label, value, Icon, note }) => (
          <div className="statistics-metric" key={label}>
            <span>
              {createElement(Icon, { size: 15 })}
              {label}
            </span>
            <strong>{number.format(value || 0)}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="statistics-progress">
        <TrendingUp size={17} />
        <strong>{rate}% complete</strong>
        <div
          className="statistics-progress-track"
          role="progressbar"
          aria-label="All-time completion"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${rate}%` }} />
        </div>
        <span>
          {number.format(stats.pendingTasks || 0)} pending <b>·</b>{" "}
          {number.format(stats.givenUpTasks || 0)} given up
        </span>
      </div>
    </section>
  );
};
export default StatsSummary;
