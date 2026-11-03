import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { createPatientTicket, getPatientTickets } from '../services/api';

const emptyForm = { category: 'inquiry', priority: 'normal', subject: '', message: '' };
const faqs = [
  ['How can I change an appointment?', 'Open My Appointments, select an upcoming visit, then choose Reschedule or Cancel. Changes are saved after the server confirms them.'],
  ['Where can I see my support request?', 'Your submitted requests appear in the Recent Requests list on this page. Open a request to read or reply to the conversation.'],
  ['Can I update my contact information?', 'Use Patient Profile to update your phone number, address, emergency contact, and care preferences. Your sign-in email is kept read-only until it is re-verified.'],
];

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function PatientSupportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [expandedFaq, setExpandedFaq] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getPatientTickets({ limit: 50, offset: 0 })
      .then(({ data }) => { if (active) setTickets(data || []); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load support requests.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        ...(location.state?.appointmentId ? { appointmentId: location.state.appointmentId } : {}),
      };
      const { data } = await createPatientTicket(payload);
      setNotice(`Request ${data.ticketNumber} was submitted.`);
      setForm(emptyForm);
      navigate(`/support/tickets/${data.id}`, { replace: true, state: { created: true } });
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit your support request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PortalHeading
          eyebrow="Patient portal"
          title="Support Center"
          description="Submit feedback, a complaint, or an inquiry and continue the conversation with our support team."
          actions={<a href="#new-request" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"><span className="material-symbols-outlined text-lg">add</span>Create a Request</a>}
        />
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.8fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your requests</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Recent Requests</h2></div>
                <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">{tickets.length} total</span>
              </div>
              {loading ? (
                <p className="py-8 text-center text-sm text-on-surface-variant">Loading your requests...</p>
              ) : tickets.length ? (
                <div className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <Link key={ticket.id} to={`/support/tickets/${ticket.id}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-primary">{ticket.ticketNumber}</span><StatusBadge status={ticket.status} /></div>
                        <h3 className="mt-1 truncate font-semibold text-on-surface">{ticket.subject}</h3>
                        <p className="mt-1 text-xs text-on-surface-variant">{ticket.category} · Updated {formatDate(ticket.updatedAt)}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">View Details<span className="material-symbols-outlined text-lg">arrow_forward</span></span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-surface-container-low px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary">forum</span>
                  <p className="mt-2 font-semibold text-on-surface">No support requests yet</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Use the form to contact the support team.</p>
                </div>
              )}
            </section>

            <section id="new-request" className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">We’re here to help</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Create a Support Request</h2></div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="mb-1.5 block text-sm font-medium text-on-surface">Request type</span><select name="category" value={form.category} onChange={updateForm} className="h-11 w-full rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"><option value="feedback">Feedback</option><option value="complaint">Complaint</option><option value="inquiry">Inquiry</option></select></label>
                  <label><span className="mb-1.5 block text-sm font-medium text-on-surface">Priority</span><select name="priority" value={form.priority} onChange={updateForm} className="h-11 w-full rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
                </div>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-on-surface">Subject</span><input name="subject" value={form.subject} onChange={updateForm} maxLength={160} placeholder="Briefly describe your request" className="h-11 w-full rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" required /></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-on-surface">Message</span><textarea name="message" value={form.message} onChange={updateForm} maxLength={5000} rows={6} placeholder="Tell us how we can help..." className="w-full resize-y rounded-lg border border-slate-200 bg-surface-container-lowest px-3 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" required /><span className="mt-1 block text-right text-xs text-on-surface-variant">{form.message.length}/5000</span></label>
                {location.state?.appointmentId && <p className="rounded-lg bg-primary-container/10 p-3 text-xs text-on-surface-variant">This request will be linked to the appointment you were viewing.</p>}
                <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60 sm:w-auto"><span className="material-symbols-outlined text-lg">send</span>{submitting ? 'Submitting...' : 'Submit Request'}</button>
              </form>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl bg-primary p-5 text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-3xl">support_agent</span>
              <h2 className="mt-2 text-xl font-semibold">How can we help?</h2>
              <p className="mt-2 text-sm leading-relaxed text-on-primary/85">Create a request to receive a reference number and continue your conversation securely in the portal.</p>
              <a href="#new-request" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary">Start a request</a>
            </section>
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Help topics</p>
              <h2 className="mt-1 text-xl font-semibold text-on-surface">Frequently Asked Questions</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {faqs.map(([question, answer], index) => (
                  <div key={question} className="py-3">
                    <button type="button" aria-expanded={expandedFaq === index} onClick={() => setExpandedFaq((current) => current === index ? -1 : index)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-on-surface">
                      {question}<span className="material-symbols-outlined text-lg text-primary">{expandedFaq === index ? 'remove' : 'add'}</span>
                    </button>
                    {expandedFaq === index && <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{answer}</p>}
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-surface-container-low p-5">
              <h2 className="font-semibold text-on-surface">Appointment assistance</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Need to update a scheduled visit?</p>
              <Link to="/appointments" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Manage appointments</Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
