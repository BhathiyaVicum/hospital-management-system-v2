export function AdminStatCard({ label, value, icon, accent = 'primary' }) {
  const accentClasses = accent === 'amber'
    ? 'bg-amber-50 text-amber-700'
    : accent === 'blue'
      ? 'bg-blue-50 text-blue-700'
      : accent === 'rose'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-primary-container/15 text-primary';
  return (
    <article className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-on-surface-variant">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses}`}><span className="material-symbols-outlined">{icon}</span></span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">{value ?? '—'}</p>
    </article>
  );
}

export function AdminEmptyState({ title, description = 'There is no data to show for this selection.', icon = 'inbox' }) {
  return (
    <div className="rounded-xl bg-surface-container-low px-4 py-10 text-center">
      <span className="material-symbols-outlined text-4xl text-primary">{icon}</span>
      <h3 className="mt-2 font-semibold text-on-surface">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">{description}</p>
    </div>
  );
}

export function AdminSection({ title, description, actions, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>{title && <h2 className="text-lg font-semibold text-on-surface">{title}</h2>}{description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}</div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminTable({ columns, rows, rowKey = 'id', renderActions }) {
  if (!rows.length) return <AdminEmptyState title="No records found" description="Try changing the search or filters, or create a new record." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{column.label}</th>)}{renderActions && <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row[rowKey]} className="align-top hover:bg-surface-container-low/60">
              {columns.map((column) => <td key={column.key} className="max-w-72 px-4 py-3 text-on-surface-variant">{column.render ? column.render(row) : (row[column.key] ?? '—')}</td>)}
              {renderActions && <td className="whitespace-nowrap px-4 py-3 text-right">{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminStatus({ active, label }) {
  const statusLabel = label || (active ? 'Active' : 'Inactive');
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel}</span>;
}

export function AdminNotice({ type = 'error', children }) {
  return <p role={type === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-xl p-3 text-sm ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{children}</p>;
}

export function formatAdminDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', ...options }).format(date);
}
