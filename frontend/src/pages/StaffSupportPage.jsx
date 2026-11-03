import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { getStaffSupportDashboard, getStaffTickets } from '../services/api';

const statusFilters = [
  ['', 'All statuses'],
  ['open', 'Open'],
  ['in_progress', 'In progress'],
  ['waiting_for_patient', 'Waiting for patient'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
];

export default function StaffSupportPage() {
  const [dashboard, setDashboard] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getStaffSupportDashboard(),
      getStaffTickets({ ...filters, limit: 50, offset: 0 }),
    ])
      .then(([dashboardResponse, ticketResponse]) => {
        if (!active) return;
        setDashboard(dashboardResponse.data);
        setTickets(ticketResponse.data || []);
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load support queue.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  const stats = dashboard?.stats;

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PortalHeading eyebrow="Support staff workspace" title="Support Queue" description="Review patient requests, continue conversations, and update ticket status." />
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {stats && (
          <section aria-label="Ticket statistics" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ['Total', stats.total, 'inbox'],
              ['Open', stats.open, 'mark_email_unread'],
              ['In progress', stats.inProgress, 'pending_actions'],
              ['Waiting', stats.waitingForPatient, 'hourglass_top'],
              ['Resolved', stats.resolved, 'task_alt'],
              ['Closed', stats.closed, 'archive'],
            ].map(([label, count, icon]) => (
              <article key={label} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200">
                <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
                <p className="mt-2 text-2xl font-semibold text-on-surface">{count}</p>
                <p className="text-xs text-on-surface-variant">{label} tickets</p>
              </article>
            ))}
          </section>
        )}

        <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Shared support queue</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Patient Requests</h2></div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input aria-label="Search tickets" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search reference, subject, patient" className="h-10 rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary sm:w-56" />
              <select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary">{statusFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select aria-label="Filter by category" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="h-10 rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary"><option value="">All categories</option><option value="feedback">Feedback</option><option value="complaint">Complaint</option><option value="inquiry">Inquiry</option></select>
            </div>
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Loading support tickets...</p>
          ) : tickets.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-on-surface-variant"><th className="px-3 py-3 font-semibold">Request</th><th className="px-3 py-3 font-semibold">Patient</th><th className="px-3 py-3 font-semibold">Category</th><th className="px-3 py-3 font-semibold">Updated</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3" /></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-surface-container-low/60">
                        <td className="px-3 py-4"><Link to={`/staff/support/tickets/${ticket.id}`} className="font-semibold text-on-surface hover:text-primary">{ticket.subject}</Link><p className="mt-1 font-mono text-xs text-on-surface-variant">{ticket.ticketNumber}</p></td>
                        <td className="px-3 py-4 text-on-surface-variant">{ticket.patientName}</td>
                        <td className="px-3 py-4 capitalize text-on-surface-variant">{ticket.category}<p className="text-xs">Priority: {ticket.priority}</p></td>
                        <td className="px-3 py-4 text-on-surface-variant">{new Date(ticket.updatedAt).toLocaleString()}</td>
                        <td className="px-3 py-4"><StatusBadge status={ticket.status} /></td>
                        <td className="px-3 py-4"><Link to={`/staff/support/tickets/${ticket.id}`} className="font-semibold text-primary">Open</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {tickets.map((ticket) => (
                  <Link key={ticket.id} to={`/staff/support/tickets/${ticket.id}`} className="block rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="font-mono text-xs text-primary">{ticket.ticketNumber}</span><h3 className="mt-1 font-semibold text-on-surface">{ticket.subject}</h3></div><StatusBadge status={ticket.status} /></div>
                    <p className="mt-2 text-sm text-on-surface-variant">{ticket.patientName} · <span className="capitalize">{ticket.category}</span> · {ticket.priority}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Updated {new Date(ticket.updatedAt).toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-surface-container-low p-8 text-center">
              <span className="material-symbols-outlined text-3xl text-primary">inbox</span>
              <p className="mt-2 font-semibold text-on-surface">No requests match these filters</p>
              <p className="mt-1 text-sm text-on-surface-variant">New patient requests will appear in the shared queue.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
