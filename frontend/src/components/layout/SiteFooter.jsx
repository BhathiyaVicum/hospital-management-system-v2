import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="bg-surface-container-low">
      <div className="bg-rose-100 px-4 py-3 text-rose-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-center gap-2 text-center text-xs leading-relaxed sm:items-center sm:text-sm">
          <span className="material-symbols-outlined mt-0.5 text-lg text-rose-700">emergency</span>
          <p>
            <strong>Medical Emergency Disclaimer:</strong> If you are experiencing a life-threatening medical emergency or severe symptoms, call 911 or go to the nearest emergency room.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-4 sm:col-span-2 lg:col-span-2">
            <Link to="/" className="flex w-fit items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined">local_hospital</span>
              </span>
              <span className="text-lg font-semibold tracking-tight text-on-surface">Medi<span className="text-primary">Connect</span></span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">
              Empathetic, connected healthcare bridging patients and clinical providers with convenient appointments and verified specialty care.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-on-surface">Clinical Network</h3>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li><Link className="hover:text-primary" to="/doctors">Find a Doctor</Link></li>
              <li><Link className="hover:text-primary" to="/specialists">Specialty Clinics</Link></li>
              <li><Link className="hover:text-primary" to="/specialists">Care Services</Link></li>
              <li><Link className="hover:text-primary" to="/doctors">Appointments</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-on-surface">Support &amp; Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li><Link className="hover:text-primary" to="/login">Help Center</Link></li>
              <li><Link className="hover:text-primary" to="/login">Patient FAQs</Link></li>
              <li><Link className="hover:text-primary" to="/register">Create an account</Link></li>
              <li><Link className="hover:text-primary" to="/login">Contact support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-on-surface">Contact &amp; Clinic Hours</h3>
            <div className="mt-3 space-y-3 text-sm text-on-surface-variant">
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-lg text-primary">call</span>
                <span>1-800-555-0199<br /><span className="text-xs">24/7 Clinical Triage</span></span>
              </p>
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                <span>750 Medical Center Blvd<br />Suite 400, Metro Health Hub</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-center text-xs text-on-surface-variant sm:flex-row sm:text-left">
          <p>© {currentYear} MediConnect Health Systems. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link className="hover:text-on-surface" to="/login">Privacy Policy</Link>
            <Link className="hover:text-on-surface" to="/login">Terms of Service</Link>
            <Link className="hover:text-on-surface" to="/login">Privacy Practices</Link>
            <Link className="hover:text-on-surface" to="/login">Patient Rights</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
