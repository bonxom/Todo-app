const OUTER_RADIUS = 40;
const INNER_RADIUS = 24;
const NUMBER_FORMATTER = new Intl.NumberFormat();

const buildSlicePath = (startAngle, endAngle) => {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = 50 + OUTER_RADIUS * Math.cos(startRad);
  const y1 = 50 + OUTER_RADIUS * Math.sin(startRad);
  const x2 = 50 + OUTER_RADIUS * Math.cos(endRad);
  const y2 = 50 + OUTER_RADIUS * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M 50 50 L ${x1} ${y1} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;
};

const createSlices = (items, total) => {
  let currentAngle = -90;

  return items.map((item) => {
    const sliceAngle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    currentAngle = endAngle;

    return {
      ...item,
      path: buildSlicePath(startAngle, endAngle),
    };
  });
};

const DonutChartCard = ({
  title,
  description,
  total,
  totalLabel = 'Total',
  items = [],
  emptyMessage,
}) => {
  if (total === 0) {
    return (
      <section className="ui-section-card ui-card-padding h-full">
        <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{title}</h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-text-muted)]">{description}</p>
        ) : null}
        <div className="mt-6 flex min-h-[18rem] items-center justify-center rounded-[12px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-4 text-sm text-[color:var(--color-text-muted)]">
          {emptyMessage}
        </div>
      </section>
    );
  }

  const slices = createSlices(items, total);

  return (
    <section className="ui-section-card ui-card-padding flex h-full flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{title}</h3>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-text-muted)]">{description}</p>
          ) : null}
        </div>
        <span className="ui-chip ui-tabular">{NUMBER_FORMATTER.format(total)} total</span>
      </div>

      <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[minmax(0,15rem)_1fr] lg:items-center">
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full max-w-[220px]" aria-hidden="true">
            {slices.map((slice) => (
              <path
                key={slice.label}
                d={slice.path}
                fill={slice.color}
                className="transition-[opacity] duration-150 hover:opacity-85"
              />
            ))}

            <circle cx="50" cy="50" r={INNER_RADIUS} fill="white" />

            <text x="50" y="47" textAnchor="middle" className="fill-slate-500 text-[7px] font-medium">
              {totalLabel}
            </text>
            <text x="50" y="56" textAnchor="middle" className="fill-slate-900 text-[10px] font-semibold">
              {NUMBER_FORMATTER.format(total)}
            </text>
          </svg>
        </div>

        <div className="max-h-[18rem] space-y-2.5 overflow-y-auto pr-1">
          {slices.map((slice) => (
            <div key={slice.label} className="flex items-center justify-between gap-4 rounded-[10px] border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-3 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-[color:var(--color-text)]">{slice.label}</span>
              </div>
              <span className="ui-tabular shrink-0 text-[color:var(--color-text-muted)]">
                {NUMBER_FORMATTER.format(slice.value)} · {slice.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DonutChartCard;
