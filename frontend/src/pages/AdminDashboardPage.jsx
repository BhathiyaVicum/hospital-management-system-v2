import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import { AdminSection, AdminStatCard, AdminNotice } from '../components/admin/AdminComponents';
import { AdminBarList, AdminTrendChart } from '../components/admin/AdminCharts';
import { getAdminDashboard } from '../services/api';

const cards = [
  ['Total patients', 'patients', 'groups', 'blue'],
  ['Doctors', 'doctors', 'stethoscope', 'primary'],
  ['Clinics', 'clinics', 'apartment', 'blue'],
  ['Healthcare services', 'services', 'medical_services', 'primary'],
  ['Support staff', 'staff', 'badge', 'amber'],
  ['Receptionists', 'receptionists', 'support_agent', 'amber'],
  ['Appointments', 'appointments', 'calendar_month', 'primary'],
  ["Today's appointments", 'today_appointments', 'today', 'blue'],
  ['Upcoming appointments', 'upcoming_appointments', 'event_available', 'primary'],
  ['Cancelled appointments', 'cancelled_appointments', 'event_busy', 'rose'],
  ['Support tickets', 'support_tickets', 'inbox', 'blue'],
  ['Open support tickets', 'open_support_tickets', 'mark_email_unread', 'amber'],
];

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getAdminDashboard();
      setDashboard(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load administration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PortalHeading
        eyebrow="Administration overview"
        title="Network Intelligence"
        description="A current overview of clinics, care teams, patients, appointments, and support activity."
        actions={<button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-on-surface disabled:opacity-60"><span className="material-symbols-outlined text-lg">refresh</span>Refresh</button>}
      />
      {error && <AdminNotice>{error}</AdminNotice>}
      {loading && !dashboard ? <div className="rounded-2xl bg-white p-12 text-center text-on-surface-variant shadow-sm">Loading live administration metrics...</div> : dashboard && (
        <>
          <section aria-label="Network statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {cards.map(([label, key, icon, accent]) => <AdminStatCard key={key} label={label} value={dashboard.stats[key]} icon={icon} accent={accent} />)}
          </section>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <AdminSection title="Appointment volume" description="Daily booked appointments over the past 30 days.">
              <AdminTrendChart title="Appointments" data={dashboard.appointmentTrend} />
            </AdminSection>
            <AdminSection title="Patient registrations" description="Daily patient account creation over the past 30 days.">
              <AdminTrendChart title="New patient registrations" data={dashboard.patientTrend} />
            </AdminSection>
            <AdminSection title="Appointment status" description="All-time distribution from appointment records.">
              <AdminBarList title="Appointments by status" rows={dashboard.appointmentStatuses} labelKey="status" />
            </AdminSection>
            <AdminSection title="Clinical specialties" description="Doctors associated with each specialty.">
              <AdminBarList title="Doctor distribution" rows={dashboard.doctorsBySpecialty} labelKey="name" />
            </AdminSection>
            <AdminSection title="Support ticket status" description="Current distribution across all support tickets.">
              <AdminBarList title="Support queue" rows={dashboard.supportStatuses} labelKey="status" />
            </AdminSection>
            <AdminSection title="Administration shortcuts" description="Open a management workspace.">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Patient registry', '/admin/patients', 'Manage patient accounts'],
                  ['Physician directory', '/admin/doctors', 'Manage doctors and specialties'],
                  ['Clinic network', '/admin/clinics', 'Update clinic details'],
                  ['Reports & analytics', '/admin/reports', 'Review date-range reports'],
                ].map(([label, to, detail]) => <Link key={to} to={to} className="rounded-xl border border-slate-200 p-4 transition hover:border-primary/40 hover:bg-surface-container-low"><span className="font-semibold text-on-surface">{label}</span><span className="mt-1 block text-sm text-on-surface-variant">{detail}</span></Link>)}
              </div>
            </AdminSection>
          </div>
        </>
      )}
    </>
  );
}
