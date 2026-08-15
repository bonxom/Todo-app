const OrbitMark = ({ className = '' }) => (
  <svg className={`orbit-mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <circle className="orbit-mark__ring orbit-mark__ring--one" cx="20" cy="20" r="14" />
    <ellipse className="orbit-mark__ring orbit-mark__ring--two" cx="20" cy="20" rx="17" ry="8" />
    <circle className="orbit-mark__core" cx="20" cy="20" r="4" />
  </svg>
);

export default OrbitMark;
