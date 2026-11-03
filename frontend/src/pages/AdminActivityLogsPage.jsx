import { useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import { AdminNotice, AdminSection, AdminStatus, AdminTable, formatAdminDate } from '../components/admin/AdminComponents';
import { getAdminActivityLogs } from '../services/api';

export default function AdminActivityLogsPage() {
  const [filters, setFilters] = useState({ search: '', role: '', eventType: '', success: '', from: '', to: '' });
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const limit = 50;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAdminActivityLogs({ ...filters, limit, offset })
      .then(({ data, pagination }) => {
        if (!active) return;
        setLogs(data || []);
        setTotal(pagination?.total || 0);
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load activity logs.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, offset]);

  const update = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  };

  return (
    <>
      <PortalHeading eyebrow="Team & security" title="System Activity & Login Logs" description="Review sign-ins and administrative events. Authentication secrets and message contents are never stored in this log." />
      {error && <AdminNotice>{error}</AdminNotice>}
      <AdminSection>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <input aria-label="Search activity" value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Search user name or email" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <select aria-label="Filter by role" value={filters.role} onChange={(event) => update('role', event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All roles</option>{['patient', 'doctor', 'staff', 'receptionist', 'admin'].map((role) => <option key={role} value={role}>{role}</option>)}</select>
          <select aria-label="Filter by event type" value={filters.eventType} onChange={(event) => update('eventType', event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All events</option>{['login.succeeded', 'login.failed', 'logout', 'password.changed', 'patient.updated', 'doctor.created', 'doctor.updated', 'clinic.created', 'clinic.updated', 'service.created', 'service.updated', 'staff.created', 'staff.updated', 'receptionist.created', 'receptionist.updated', 'support.ticket.status_changed', 'support.ticket.assigned'].map((event) => <option key={event} value={event}>{event}</option>)}</select>
          <select aria-label="Filter by result" value={filters.success} onChange={(event) => update('success', event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Successful and failed</option><option value="true">Successful</option><option value="false">Failed</option></select>
          <label className="text-xs text-on-surface-variant">From<input type="date" value={filters.from} onChange={(event) => update('from', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-2 text-sm text-on-surface" /></label>
          <label className="text-xs text-on-surface-variant">To<input type="date" value={filters.to} onChange={(event) => update('to', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-2 text-sm text-on-surface" /></label>
        </div>
        <p className="mb-3 text-xs text-on-surface-variant">{total} events found</p>
        {loading ? <p className="py-10 text-center text-sm text-on-surface-variant">Loading activity...</p> : <AdminTable columns={[
          { key: 'occurredAt', label: 'Timestamp', render: (row) => formatAdminDate(row.occurredAt, { timeStyle: 'short' }) },
          { key: 'eventType', label: 'Event', render: (row) => <span className="font-medium text-on-surface">{row.eventType}</span> },
          { key: 'actorName', label: 'User', render: (row) => row.actorName || row.attemptedEmail || 'Unknown account' },
          { key: 'actorRole', label: 'Role' },
          { key: 'success', label: 'Result', render: (row) => <AdminStatus active={row.success} label={row.success ? 'Success' : 'Failed'} /> },
        ]} rows={logs} renderActions={(row) => <button type="button" onClick={() => setSelected(row)} className="font-semibold text-primary hover:underline">Details</button>} />}
        {total > limit && <div className="mt-4 flex justify-between"><button type="button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - limit))} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">Previous</button><span className="self-center text-sm text-on-surface-variant">{offset + 1}–{Math.min(offset + limit, total)} of {total}</span><button type="button" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">Next</button></div>}
      </AdminSection>
      {selected && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Audit record</p><h2 id="activity-detail-title" className="mt-1 text-xl font-semibold">{selected.eventType}</h2></div><button type="button" aria-label="Close event details" onClick={() => setSelected(null)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-xs text-on-surface-variant">Timestamp</dt><dd>{formatAdminDate(selected.occurredAt, { dateStyle: 'full', timeStyle: 'medium' })}</dd></div><div><dt className="text-xs text-on-surface-variant">IP address</dt><dd>{selected.ipAddress || 'Not available'}</dd></div><div><dt className="text-xs text-on-surface-variant">User agent</dt><dd className="break-all">{selected.userAgent || 'Not available'}</dd></div><div><dt className="text-xs text-on-surface-variant">Context</dt><dd><pre className="mt-1 overflow-x-auto rounded-lg bg-surface-container-low p-3 text-xs">{JSON.stringify(selected.details || {}, null, 2)}</pre></dd></div></dl></section></div>}
    </>
  );
}
