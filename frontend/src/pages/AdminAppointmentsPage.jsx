import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import { AdminNotice, AdminSection, AdminStatus, AdminTable, formatAdminDate } from '../components/admin/AdminComponents';
import { getAdminAppointments, getAdminAppointment } from '../services/api';

function AppointmentDetails({ appointmentId, onClose }) {
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getAdminAppointment(appointmentId)
      .then(({ data }) => { if (active) setAppointment(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load appointment.'); });
    return () => { active = false; };
  }, [appointmentId]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="admin-appointment-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Master appointment record</p><h2 id="admin-appointment-title" className="mt-1 text-xl font-semibold">Appointment details</h2></div><button type="button" onClick={onClose} aria-label="Close appointment details" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
        {error ? <AdminNotice>{error}</AdminNotice> : !appointment ? <p className="py-10 text-center text-sm text-on-surface-variant">Loading appointment...</p> : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Patient', appointment.patientName], ['Patient email', appointment.patientEmail],
              ['Doctor', appointment.doctorName], ['Doctor email', appointment.doctorEmail],
              ['Clinic', appointment.clinicName], ['Status', <AdminStatus key="status" active={appointment.status === 'confirmed'} label={appointment.status} />],
              ['Starts', formatAdminDate(appointment.scheduledStart, { timeStyle: 'short' })],
              ['Created', formatAdminDate(appointment.createdAt, { timeStyle: 'short' })],
              ['Cancelled', appointment.cancelledAt ? formatAdminDate(appointment.cancelledAt, { timeStyle: 'short' }) : '—'],
              ['Cancelled by', appointment.cancelledBy || '—'], ['Fee snapshot', appointment.fee],
              ['Visit reason', appointment.reason || '—'],
            ].map(([label, value]) => <div key={label} className="rounded-lg bg-surface-container-low p-3"><p className="text-xs text-on-surface-variant">{label}</p><p className="mt-1 break-words text-sm font-medium">{value || '—'}</p></div>)}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminAppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: '', status: '', doctorId: '', patientId: '', clinicId: '',
    from: '', to: '',
  });
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 25;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAdminAppointments({ ...filters, limit, offset })
      .then(({ data, pagination }) => {
        if (!active) return;
        setAppointments(data || []);
        setTotal(pagination?.total || 0);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load appointments.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, offset]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  };
  const openAppointment = (id) => {
    setSelectedId(id);
    setSearchParams({ id });
  };
  const closeAppointment = () => {
    setSelectedId('');
    setSearchParams({});
  };

  return (
    <>
      <PortalHeading eyebrow="Patients & bookings" title="Master Appointment Management" description="Review application-wide appointments, search by patient or clinician, and filter by date and status." />
      {error && <AdminNotice>{error}</AdminNotice>}
      <AdminSection>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input aria-label="Search appointments" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search patient, doctor, clinic" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <select aria-label="Appointment status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          <input aria-label="Filter by doctor ID" value={filters.doctorId} onChange={(event) => updateFilter('doctorId', event.target.value)} placeholder="Doctor ID (optional)" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <input aria-label="Filter by patient ID" value={filters.patientId} onChange={(event) => updateFilter('patientId', event.target.value)} placeholder="Patient ID (optional)" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <input aria-label="Filter by clinic ID" value={filters.clinicId} onChange={(event) => updateFilter('clinicId', event.target.value)} placeholder="Clinic ID (optional)" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <label className="text-xs text-on-surface-variant">From<input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-2 text-sm text-on-surface" /></label>
          <label className="text-xs text-on-surface-variant">To<input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-2 text-sm text-on-surface" /></label>
          <button type="button" onClick={() => { setFilters({ search: '', status: '', doctorId: '', patientId: '', clinicId: '', from: '', to: '' }); setOffset(0); }} className="min-h-10 self-end rounded-lg px-3 text-sm font-semibold text-primary hover:bg-surface-container">Reset filters</button>
        </div>
        <p className="mb-3 text-xs text-on-surface-variant">{total} appointments found</p>
        {loading ? <p className="py-10 text-center text-sm text-on-surface-variant">Loading appointments...</p> : (
          <AdminTable columns={[
            { key: 'id', label: 'Booking reference', render: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8).toUpperCase()}</span> },
            { key: 'patientName', label: 'Patient', render: (row) => <span><strong className="block font-medium text-on-surface">{row.patientName}</strong><span className="text-xs">{row.patientEmail}</span></span> },
            { key: 'doctorName', label: 'Clinician' },
            { key: 'clinicName', label: 'Clinic' },
            { key: 'scheduledStart', label: 'Date & time', render: (row) => formatAdminDate(row.scheduledStart, { timeStyle: 'short' }) },
            { key: 'status', label: 'Status', render: (row) => <AdminStatus active={row.status === 'confirmed'} label={row.status} /> },
          ]} rows={appointments} renderActions={(row) => <button type="button" onClick={() => openAppointment(row.id)} className="font-semibold text-primary hover:underline">View</button>} />
        )}
        {total > limit && <div className="mt-4 flex justify-between"><button type="button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - limit))} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">Previous</button><span className="self-center text-sm text-on-surface-variant">{offset + 1}–{Math.min(offset + limit, total)} of {total}</span><button type="button" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">Next</button></div>}
      </AdminSection>
      {selectedId && <AppointmentDetails appointmentId={selectedId} onClose={closeAppointment} />}
    </>
  );
}
