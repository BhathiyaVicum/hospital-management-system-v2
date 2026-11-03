import { useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import { AdminBarList, AdminTrendChart } from '../components/admin/AdminCharts';
import { AdminNotice, AdminSection, AdminStatCard, AdminTable, formatAdminDate } from '../components/admin/AdminComponents';
import { getAdminReports } from '../services/api';

const reportToday = new Date();
const reportRangeStart = new Date(reportToday);
reportRangeStart.setDate(reportToday.getDate() - 29);

function csvCell(value) {
  const text = String(value ?? '');
  const protectedText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

function exportCsv(reports) {
  const sections = [
    ['Patients by status', ['Registered', reports.patients.total], ['Active', reports.patients.active], ['Inactive', reports.patients.inactive], ['Registrations in range', reports.patients.registrations]],
    ['Appointments by status', ['Status', 'Count'], ...reports.appointmentsByStatus.map((row) => [row.status, row.count])],
    ['Appointments by day', ['Date', 'Appointments'], ...reports.appointmentTrend.map((row) => [row.date, row.count])],
    ['Clinics', ['Clinic', 'Doctors', 'Appointments'], ...reports.clinics.map((row) => [row.name, row.doctorCount, row.appointmentCount])],
    ['Doctors by specialty', ['Specialty', 'Doctors', 'Active', 'Inactive'], ...reports.doctorsBySpecialty.map((row) => [row.name, row.doctors, row.active, row.inactive])],
    ['Support by category', ['Category', 'Count'], ...reports.supportByCategory.map((row) => [row.category, row.count])],
  ];
  const content = sections.flatMap((rows) => rows.map((row) => row.map(csvCell).join(','))).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mediconnect-admin-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [filters, setFilters] = useState({ from: reportRangeStart.toISOString().slice(0, 10), to: reportToday.toISOString().slice(0, 10) });
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAdminReports(filters)
      .then(({ data }) => { if (active) { setReports(data); setError(''); } })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load reports.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  return (
    <>
      <PortalHeading eyebrow="Network intelligence" title="Reports & Analytics" description="Review dated operational reports from appointment, patient, clinic, and support records." actions={reports && <button type="button" onClick={() => exportCsv(reports)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary"><span className="material-symbols-outlined text-lg">download</span>Export CSV</button>} />
      {error && <AdminNotice>{error}</AdminNotice>}
      <AdminSection title="Report scope" description="Choose a range up to 12 months. Account totals include all records; trends and activity use this range.">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-on-surface-variant">From<input type="date" value={filters.from} max={filters.to} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-on-surface" /></label>
          <label className="text-xs font-medium text-on-surface-variant">To<input type="date" value={filters.to} min={filters.from} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-on-surface" /></label>
          <p className="text-xs text-on-surface-variant sm:pb-3">{formatAdminDate(filters.from)} — {formatAdminDate(filters.to)}</p>
        </div>
      </AdminSection>
      {loading && !reports ? <p className="py-12 text-center text-on-surface-variant">Generating reports...</p> : reports && (
        <>
          <section aria-label="Patient totals" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminStatCard label="Registered patients" value={reports.patients.total} icon="groups" />
            <AdminStatCard label="Active accounts" value={reports.patients.active} icon="verified_user" accent="blue" />
            <AdminStatCard label="Inactive accounts" value={reports.patients.inactive} icon="person_off" accent="amber" />
            <AdminStatCard label="New in range" value={reports.patients.registrations} icon="person_add" accent="primary" />
          </section>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <AdminSection title="Appointment fulfillment" description="Appointments by scheduled start in the selected date range.">
              <AdminTrendChart title="Daily appointment volume" data={reports.appointmentTrend} />
              <div className="mt-6"><AdminBarList title="Appointments by status" rows={reports.appointmentsByStatus} labelKey="status" /></div>
            </AdminSection>
            <AdminSection title="Clinical network" description="Doctor activity by specialty and clinic appointment load.">
              <AdminBarList title="Doctors by specialty" rows={reports.doctorsBySpecialty} labelKey="name" valueKey="doctors" />
              <div className="mt-6"><AdminTable columns={[{ key: 'name', label: 'Clinic' }, { key: 'doctorCount', label: 'Doctors' }, { key: 'appointmentCount', label: 'Appointments' }]} rows={reports.clinics} /></div>
            </AdminSection>
            <AdminSection title="Support insights" description="Ticket counts by creation date within the selected range.">
              <AdminBarList title="Tickets by category" rows={reports.supportByCategory} labelKey="category" />
              <div className="mt-6"><AdminBarList title="Tickets by status" rows={reports.supportByStatus} labelKey="status" /></div>
            </AdminSection>
            <AdminSection title="Team workload" description="Assigned tickets and resolutions recorded during the selected range.">
              <AdminTable columns={[{ key: 'name', label: 'Staff member' }, { key: 'email', label: 'Email' }, { key: 'assignedTickets', label: 'Assigned total' }, { key: 'active', label: 'Active' }, { key: 'resolved', label: 'Resolved in range' }]} rows={reports.staffWorkload} />
            </AdminSection>
          </div>
        </>
      )}
    </>
  );
}
