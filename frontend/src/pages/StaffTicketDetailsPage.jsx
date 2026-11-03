import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { formatStatus } from '../components/common/statusFormatting';
import {
  getStaffTicket,
  getSupportStaff,
  replyToStaffTicket,
  updateStaffTicketAssignment,
  updateStaffTicketStatus,
} from '../services/api';

const statuses = ['open', 'in_progress', 'waiting_for_patient', 'resolved', 'closed'];

function dateTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function StaffTicketDetailsPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [staff, setStaff] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTicket = useCallback(async () => {
    const { data } = await getStaffTicket(ticketId);
    setTicket(data);
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    Promise.all([getStaffTicket(ticketId), getSupportStaff()])
      .then(([ticketResponse, staffResponse]) => {
        if (!active) return;
        setTicket(ticketResponse.data);
        setStaff(staffResponse.data || []);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load this support request.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticketId]);

  const handleReply = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await replyToStaffTicket(ticketId, message);
      setMessage('');
      await loadTicket();
    } catch (requestError) {
      setError(requestError.message || 'Unable to send this reply.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (event) => {
    const status = event.target.value;
    setSaving(true);
    setError('');
    try {
      const { data } = await updateStaffTicketStatus(ticketId, status);
      setTicket(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update ticket status.');
      event.target.value = ticket.status;
    } finally {
      setSaving(false);
    }
  };

  const handleAssignment = async (event) => {
    const assignedStaffId = event.target.value || null;
    setSaving(true);
    setError('');
    try {
      const { data } = await updateStaffTicketAssignment(ticketId, assignedStaffId);
      setTicket(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update ticket assignment.');
      event.target.value = ticket.assignedStaffId || '';
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading support ticket...</div>;
  if (error && !ticket) return <div role="alert" className="mx-auto max-w-7xl px-4 py-12 text-red-700">{error}</div>;
  if (!ticket) return null;

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"><Link to="/staff/support" className="hover:text-primary">Support Queue</Link><span>/</span><span className="font-medium text-on-surface">{ticket.ticketNumber}</span></div>
        <PortalHeading eyebrow={`Patient support · ${ticket.ticketNumber}`} title={ticket.subject} description={`Created ${dateTime(ticket.createdAt)} · Updated ${dateTime(ticket.updatedAt)}`} actions={<StatusBadge status={ticket.status} />} />
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.7fr)]">
          <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="mb-5 text-xl font-semibold text-on-surface">Conversation</h2>
            <div className="space-y-4">
              {ticket.messages.map((item) => {
                const fromStaff = item.senderRole === 'staff';
                return (
                  <article key={item.id} className={`max-w-[95%] rounded-2xl p-4 sm:max-w-[85%] ${fromStaff ? 'ml-auto bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className={`font-semibold ${fromStaff ? 'text-on-primary' : 'text-primary'}`}>{fromStaff ? item.senderName || 'Support staff' : ticket.patientName}</span>
                      <time className={fromStaff ? 'text-on-primary/75' : 'text-on-surface-variant'}>{dateTime(item.createdAt)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
                  </article>
                );
              })}
            </div>
            {ticket.status !== 'closed' && ticket.status !== 'resolved' ? (
              <form onSubmit={handleReply} className="mt-6 border-t border-slate-100 pt-5">
                <label htmlFor="staff-reply" className="mb-2 block text-sm font-semibold text-on-surface">Reply to patient</label>
                <textarea id="staff-reply" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={4} required placeholder="Write a response..." className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <div className="mt-2 flex justify-between text-xs text-on-surface-variant"><span>Sending a reply sets the ticket to Waiting for patient.</span><span>{message.length}/5000</span></div>
                <button type="submit" disabled={saving || !message.trim()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"><span className="material-symbols-outlined text-lg">send</span>{saving ? 'Sending...' : 'Send Reply'}</button>
              </form>
            ) : (
              <p className="mt-6 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">This ticket is {ticket.status}; replies are unavailable.</p>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold text-on-surface">Request information</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-xs text-on-surface-variant">Patient</dt><dd className="mt-0.5 font-medium text-on-surface">{ticket.patientName}</dd><dd className="text-xs text-on-surface-variant">{ticket.patientEmail}</dd></div>
                <div><dt className="text-xs text-on-surface-variant">Category · priority</dt><dd className="mt-0.5 font-medium capitalize text-on-surface">{ticket.category} · {ticket.priority}</dd></div>
                {ticket.appointmentId && <div><dt className="text-xs text-on-surface-variant">Related appointment</dt><dd className="mt-0.5"><Link to={`/appointments/${ticket.appointmentId}`} className="font-semibold text-primary hover:underline">{ticket.appointmentDoctorName || ticket.appointmentId}</Link></dd></div>}
              </dl>
            </section>
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold text-on-surface">Manage ticket</h2>
              <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Status</span><select value={ticket.status} onChange={handleStatus} disabled={saving} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary disabled:opacity-60">{statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
              <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Assigned staff</span><select value={ticket.assignedStaffId || ''} onChange={handleAssignment} disabled={saving} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary disabled:opacity-60"><option value="">Shared queue (unassigned)</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
              {saving && <p className="mt-3 text-xs text-on-surface-variant">Saving ticket changes...</p>}
            </section>
            <Link to="/staff/support" className="inline-flex text-sm font-semibold text-primary hover:underline">Back to support queue</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
