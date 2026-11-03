import { useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { AdminNotice, AdminSection, AdminTable, formatAdminDate } from '../components/admin/AdminComponents';
import {
  assignAdminSupportTicket,
  getAdminSupportStaff,
  getAdminSupportTicket,
  getAdminSupportTickets,
  replyToAdminSupportTicket,
  updateAdminSupportTicketStatus,
} from '../services/api';

const ticketStatuses = ['open', 'in_progress', 'waiting_for_patient', 'resolved', 'closed'];

function TicketDialog({ ticketId, onClose, staff, onUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTicket = useCallback(async () => {
    const { data } = await getAdminSupportTicket(ticketId);
    setTicket(data);
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    getAdminSupportTicket(ticketId)
      .then(({ data }) => { if (active) setTicket(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load ticket.'); });
    return () => { active = false; };
  }, [ticketId]);

  const updateStatus = async (status) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await updateAdminSupportTicketStatus(ticketId, status);
      setTicket(data);
      onUpdated();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update ticket status.');
    } finally { setSaving(false); }
  };

  const updateAssignee = async (assignedStaffId) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await assignAdminSupportTicket(ticketId, assignedStaffId || null);
      setTicket(data);
      onUpdated();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update ticket assignment.');
    } finally { setSaving(false); }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await replyToAdminSupportTicket(ticketId, message);
      setMessage('');
      await loadTicket();
      onUpdated();
    } catch (requestError) {
      setError(requestError.message || 'Unable to send reply.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="admin-ticket-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{ticket?.ticketNumber || 'Support case'}</p><h2 id="admin-ticket-title" className="mt-1 text-xl font-semibold">{ticket?.subject || 'Ticket details'}</h2></div><button type="button" aria-label="Close ticket" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
        {error && <AdminNotice>{error}</AdminNotice>}
        {!ticket ? <p className="py-10 text-center text-sm text-on-surface-variant">Loading ticket...</p> : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge status={ticket.status} /><span className="rounded-full bg-surface-container px-3 py-1 text-xs capitalize">{ticket.category} · {ticket.priority} priority</span><span className="text-xs text-on-surface-variant">Patient: {ticket.patientName} · {ticket.patientEmail}</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-on-surface-variant">Status<select value={ticket.status} disabled={saving} onChange={(event) => updateStatus(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-on-surface">{ticketStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-semibold text-on-surface-variant">Assigned staff<select value={ticket.assignedStaffId || ''} disabled={saving} onChange={(event) => updateAssignee(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-on-surface"><option value="">Unassigned</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
            </div>
            <div className="mt-5 space-y-3 rounded-xl bg-surface-container-low p-4">
              {(ticket.messages || []).map((item) => <article key={item.id} className="rounded-xl bg-white p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{item.senderName} <span className="font-normal text-on-surface-variant">· {item.senderRole}</span></p><time className="text-xs text-on-surface-variant">{formatAdminDate(item.createdAt, { timeStyle: 'short' })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-on-surface">{item.message}</p></article>)}
              {!ticket.messages?.length && <p className="py-5 text-center text-sm text-on-surface-variant">No messages in this ticket yet.</p>}
            </div>
            <form onSubmit={sendReply} className="mt-4"><label className="block text-sm font-medium">Reply to patient<textarea required maxLength={5000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-primary" /></label><div className="mt-3 flex justify-end"><button type="submit" disabled={saving || !message.trim() || ticket.status === 'closed' || ticket.status === 'resolved'} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">{saving ? 'Saving...' : 'Send reply'}</button></div></form>
          </>
        )}
      </section>
    </div>
  );
}

export default function AdminSupportPage() {
  const [filters, setFilters] = useState({ search: '', status: '', category: '' });
  const [tickets, setTickets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 30;

  useEffect(() => {
    let active = true;
    getAdminSupportTickets({ ...filters, limit, offset })
      .then(({ data, pagination }) => {
        if (!active) return;
        setTickets(data || []);
        setTotal(pagination?.total || 0);
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load support tickets.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, offset, refreshKey]);
  useEffect(() => {
    getAdminSupportStaff().then(({ data }) => setStaff(data || [])).catch((requestError) => setError(requestError.message || 'Unable to load support staff.'));
  }, []);

  return (
    <>
      <PortalHeading eyebrow="Team & security" title="Support & Inquiries Administration" description="Review patient inquiries, manage ticket status, and assign cases to support staff." />
      {error && <AdminNotice>{error}</AdminNotice>}
      <AdminSection>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <input aria-label="Search support tickets" value={filters.search} onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, search: event.target.value })); setOffset(0); }} placeholder="Search reference, subject, patient" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <select aria-label="Filter tickets by status" value={filters.status} onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, status: event.target.value })); setOffset(0); }} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option>{ticketStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select>
          <select aria-label="Filter tickets by category" value={filters.category} onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, category: event.target.value })); setOffset(0); }} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All categories</option><option value="feedback">Feedback</option><option value="complaint">Complaint</option><option value="inquiry">Inquiry</option></select>
        </div>
        <p className="mb-3 text-xs text-on-surface-variant">{total} tickets</p>
        {loading ? <p className="py-10 text-center text-sm text-on-surface-variant">Loading support queue...</p> : <AdminTable columns={[
          { key: 'ticketNumber', label: 'Reference', render: (row) => <span className="font-mono text-xs font-semibold text-primary">{row.ticketNumber}</span> },
          { key: 'subject', label: 'Inquiry', render: (row) => <span><strong className="block font-medium text-on-surface">{row.subject}</strong><span className="text-xs">{row.patientName}</span></span> },
          { key: 'category', label: 'Category' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'updatedAt', label: 'Updated', render: (row) => formatAdminDate(row.updatedAt, { timeStyle: 'short' }) },
        ]} rows={tickets} renderActions={(row) => <button type="button" onClick={() => setSelectedId(row.id)} className="font-semibold text-primary hover:underline">Manage</button>} />}
        {total > limit && <div className="mt-4 flex justify-between"><button type="button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - limit))} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">Previous</button><span className="self-center text-sm text-on-surface-variant">{offset + 1}–{Math.min(offset + limit, total)} of {total}</span><button type="button" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">Next</button></div>}
      </AdminSection>
      {selectedId && <TicketDialog ticketId={selectedId} staff={staff} onClose={() => setSelectedId('')} onUpdated={() => { setLoading(true); setRefreshKey((current) => current + 1); }} />}
    </>
  );
}
