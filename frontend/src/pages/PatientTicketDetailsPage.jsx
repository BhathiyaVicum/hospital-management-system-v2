import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { getPatientTicket, replyToPatientTicket } from '../services/api';

function dateTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function PatientTicketDetailsPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadTicket = useCallback(async () => {
    const { data } = await getPatientTicket(ticketId);
    setTicket(data);
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    getPatientTicket(ticketId)
      .then(({ data }) => { if (active) setTicket(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load this support request.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticketId]);

  const handleReply = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await replyToPatientTicket(ticketId, message);
      setMessage('');
      await loadTicket();
    } catch (requestError) {
      setError(requestError.message || 'Unable to send your reply.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading support conversation...</div>;
  if (error && !ticket) return <div role="alert" className="mx-auto max-w-7xl px-4 py-12 text-red-700">{error}</div>;
  if (!ticket) return null;

  const replyAllowed = ticket.status !== 'closed';

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant"><Link to="/support" className="hover:text-primary">Support Center</Link><span>/</span><span className="font-medium text-on-surface">{ticket.ticketNumber}</span></div>
        <PortalHeading eyebrow={`Support request · ${ticket.ticketNumber}`} title={ticket.subject} description={`Created ${dateTime(ticket.createdAt)} · Last updated ${dateTime(ticket.updatedAt)}`} actions={<StatusBadge status={ticket.status} />} />
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(270px,0.7fr)]">
          <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-on-surface">Conversation</h2><span className="text-xs text-on-surface-variant">{ticket.messages.length} messages</span></div>
            <div className="space-y-4">
              {ticket.messages.map((item) => {
                const fromPatient = item.senderRole === 'patient';
                return (
                  <article key={item.id} className={`max-w-[95%] rounded-2xl p-4 sm:max-w-[85%] ${fromPatient ? 'ml-auto bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className={`font-semibold ${fromPatient ? 'text-on-primary' : 'text-primary'}`}>{fromPatient ? 'You' : 'Support team'}</span>
                      <time className={fromPatient ? 'text-on-primary/75' : 'text-on-surface-variant'}>{dateTime(item.createdAt)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
                  </article>
                );
              })}
            </div>
            {replyAllowed ? (
              <form onSubmit={handleReply} className="mt-6 border-t border-slate-100 pt-5">
                <label htmlFor="patient-reply" className="mb-2 block text-sm font-semibold text-on-surface">Reply to this request</label>
                <textarea id="patient-reply" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={4} required placeholder="Write your message..." className="w-full resize-y rounded-xl border border-slate-200 bg-surface-container-lowest px-3 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <div className="mt-2 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><span className="text-xs text-on-surface-variant">{message.length}/5000 characters</span><button type="submit" disabled={sending || !message.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"><span className="material-symbols-outlined text-lg">send</span>{sending ? 'Sending...' : 'Send Reply'}</button></div>
              </form>
            ) : (
              <p className="mt-6 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">This request is closed. Create a new request if you need additional help.</p>
            )}
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold text-on-surface">Request details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-xs text-on-surface-variant">Category</dt><dd className="mt-0.5 font-medium capitalize text-on-surface">{ticket.category}</dd></div>
                <div><dt className="text-xs text-on-surface-variant">Priority</dt><dd className="mt-0.5 font-medium capitalize text-on-surface">{ticket.priority}</dd></div>
                <div><dt className="text-xs text-on-surface-variant">Assigned to</dt><dd className="mt-0.5 font-medium text-on-surface">{ticket.assignedStaffName || 'Support team'}</dd></div>
                {ticket.appointmentId && <div><dt className="text-xs text-on-surface-variant">Related appointment</dt><dd className="mt-0.5"><Link to={`/appointments/${ticket.appointmentId}`} className="font-semibold text-primary hover:underline">{ticket.appointmentDoctorName || 'View appointment'}{ticket.appointmentStart ? ` · ${dateTime(ticket.appointmentStart)}` : ''}</Link></dd></div>}
              </dl>
            </section>
            <section className="rounded-2xl bg-surface-container-low p-5">
              <h2 className="font-semibold text-on-surface">Need urgent help?</h2>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">For emergencies, contact local emergency services. This portal is not monitored for urgent medical needs.</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
