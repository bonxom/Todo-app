const DonutChartCard = ({
  title,
  description,
  total,
  totalLabel = "Total",
  items = [],
  emptyMessage,
}) => {
  let offset = 0;
  const segments = items.map((item) => {
    const start = offset;
    offset += total ? (item.value / total) * 100 : 0;
    return `${item.color} ${start}% ${offset}%`;
  });
  return (
    <section className="statistics-card">
      <div className="statistics-card-header">
        <div>
          <h2>{title}</h2>
          {description && (
            <p className="statistics-card-description">{description}</p>
          )}
        </div>
        <span className="statistics-small-label">All time</span>
      </div>
      <div className="statistics-donut-layout">
        <div
          className="statistics-donut"
          style={{
            background: total
              ? `conic-gradient(${segments.join(",")})`
              : "var(--color-surface-muted)",
          }}
          aria-hidden="true"
        >
          <div className="statistics-donut-center">
            <strong>{total.toLocaleString()}</strong>
            <span>{totalLabel}</span>
          </div>
        </div>
        {total ? (
          <div className="statistics-legend">
            {items.map((item) => (
              <div className="statistics-legend-row" key={item.label}>
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString()}</strong>
                <small>{Math.round(Number(item.percentage))}%</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="statistics-empty-note">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
};
export default DonutChartCard;
