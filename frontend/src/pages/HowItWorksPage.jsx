import { Link } from 'react-router-dom';

const steps = [
  {
    title: 'Find a Doctor',
    description: 'Search by specialty, clinic, or location. Compare verified schedules, consultation fees, and patient ratings to find the right specialist for your needs.',
    icon: 'search',
    color: 'bg-secondary-container text-on-secondary-container'
  },
  {
    title: 'Choose a Time',
    description: 'Select from real-time available slots. We offer both in-person clinic visits and secure telehealth video consultations.',
    icon: 'calendar_month',
    color: 'bg-secondary-container text-on-secondary-container'
  },
  {
    title: 'Confirm & Attend',
    description: 'Receive instant SMS and email confirmations. Manage your appointment, reschedule if needed, and access your clinical notes directly from your portal.',
    icon: 'check_circle',
    color: 'bg-surface-container-high text-on-surface'
  },
];

const patientFeatures = [
  { title: 'View Medical Records', desc: 'Access your consultation notes and treatment plans.', icon: 'clinical_notes' },
  { title: 'Secure Messaging', desc: 'Communicate safely with your care team.', icon: 'chat' },
  { title: 'Appointment History', desc: 'Track past and upcoming visits in one place.', icon: 'history' },
];

const doctorFeatures = [
  { title: 'Manage Availability', desc: 'Set your weekly schedule or block specific dates.', icon: 'event_available' },
  { title: 'Patient Workflow', desc: 'Track arrivals, consultations, and completions.', icon: 'timeline' },
  { title: 'Clinical Documentation', desc: 'Write and store consultation notes securely.', icon: 'edit_document' },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-surface pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface-container-low py-20 text-center">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Simple & Transparent</span>
          <h1 className="mt-4 text-4xl font-semibold text-on-surface sm:text-5xl">How MediConnect Works</h1>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            We bridge the gap between accredited clinical providers and patients. Book real-time appointments, access unified health records, and manage your care journey without the wait.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-2xl bg-surface-container-lowest p-8 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color}`}>
                <span className="material-symbols-outlined text-3xl">{step.icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-on-surface">{index + 1}. {step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
            </div>
          ))}
        </div>
      </section>


      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-3xl bg-primary p-10 text-on-primary shadow-xl">
          <h2 className="text-3xl font-semibold">Ready to take control of your health?</h2>
          <p className="mt-3 text-lg text-primary/80">
            Join thousands of patients who have simplified their healthcare journey.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/doctors" className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-slate-100">
              Book an Appointment
            </Link>
            <Link to="/register" className="rounded-xl border border-primary-fixed px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Register Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}