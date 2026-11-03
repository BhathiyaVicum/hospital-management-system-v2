import { AdminEmptyState } from './AdminComponents';

export function AdminTrendChart({ title, data = [] }) {
  const maximum = Math.max(1, ...data.map((point) => Number(point.count)));
  const hasData = data.some((point) => Number(point.count) > 0);
  const coordinates = data.map((point, index) => {
    const x = data.length < 2 ? 50 : (index / (data.length - 1)) * 100;
    const y = 90 - (Number(point.count) / maximum) * 78;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div>
      <h3 className="mb-1 font-semibold text-on-surface">{title}</h3>
      <p className="mb-4 text-xs text-on-surface-variant">Daily totals · last 30 days</p>
      {!hasData ? <AdminEmptyState title="No activity in this period" /> : (
        <>
          <div className="h-52 rounded-xl bg-surface-container-low p-3">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${title} line chart`} className="h-full w-full overflow-visible">
              <line x1="0" y1="90" x2="100" y2="90" stroke="#bcc9c6" strokeWidth="0.5" />
              <polyline points={coordinates} fill="none" stroke="#00685f" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-on-surface-variant">
            <span>{data[0]?.date}</span><span>{data[Math.floor(data.length / 2)]?.date}</span><span>{data[data.length - 1]?.date}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminBarList({ title, rows = [], labelKey, valueKey = 'count' }) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return (
    <div>
      <h3 className="mb-4 font-semibold text-on-surface">{title}</h3>
      {!rows.length || rows.every((row) => Number(row[valueKey] || 0) === 0)
        ? <AdminEmptyState title="No records in this category" />
        : <div className="space-y-4">
          {rows.map((row) => (
            <div key={row[labelKey]}>
              <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate text-on-surface-variant">{String(row[labelKey]).replaceAll('_', ' ')}</span><span className="font-semibold text-on-surface">{row[valueKey]}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (Number(row[valueKey] || 0) / maximum) * 100)}%` }} /></div>
            </div>
          ))}
        </div>}
    </div>
  );
}
