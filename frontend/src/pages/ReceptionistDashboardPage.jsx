import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import { getReceptionistDashboard } from '../services/api';

const cardClass = 'rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200';

export default function ReceptionistDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getReceptionistDashboard().then(({ data: result }) => {
      if (active) setData(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message || 'Unable to load reception workspace.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <WorkspaceLayout role="receptionist">
      <PortalHeading
        eyebrow="Reception workspace"
        title="Clinic operations"
        description="Coordinate patient arrivals, appointment changes, and walk-in scheduling for your assigned locations."
        actions={<Link to="/receptionist/appointments" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary">Manage appointments</Link>}
      />
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-on-surface-variant">Loading reception workspace...</p> : data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Today’s appointments', data.counts.todayAppointments, 'event'],
              ['Upcoming appointments', data.counts.upcomingAppointments, 'calendar_month'],
              ['Arrivals to process', data.counts.arrivalsToProcess, 'how_to_reg'],
              ['Walk-ins this week', data.counts.recentWalkIns, 'directions_walk'],
            ].map(([label, value, icon]) => (
              <article key={label} className={cardClass}>
                <div className="flex items-center justify-between gap-3"><p className="text-sm text-on-surface-variant">{label}</p><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container/20 text-primary"><span className="material-symbols-outlined">{icon}</span></span></div>
                <p className="mt-4 text-3xl font-semibold">{value ?? 0}</p>
              </article>
            ))}
          </div>
          <section className={`${cardClass} mt-6`}>
            <h2 className="text-lg font-semibold">Your assigned clinics</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Patient and appointment access is limited to these locations.</p>
            {data.clinics.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{data.clinics.map((clinic) => (
              <article key={clinic.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3"><span className="material-symbols-outlined text-primary">apartment</span><div><h3 className="font-semibold">{clinic.name}</h3><p className="mt-1 text-sm text-on-surface-variant">{clinic.city}{clinic.address ? ` · ${clinic.address}` : ''}</p>{clinic.phone && <p className="mt-1 text-sm text-on-surface-variant">{clinic.phone}</p>}</div></div>
              </article>
            ))}</div> : <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No clinics are assigned. Ask an administrator to assign your clinic locations.</p>}
          </section>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link to="/receptionist/appointments" className={`${cardClass} group hover:ring-primary`}><span className="material-symbols-outlined text-3xl text-primary">event_available</span><h2 className="mt-3 font-semibold">Appointments and check-in</h2><p className="mt-1 text-sm text-on-surface-variant">Book, reschedule, cancel, and track patients arriving at the clinic.</p></Link>
            <Link to="/receptionist/patients" className={`${cardClass} group hover:ring-primary`}><span className="material-symbols-outlined text-3xl text-primary">groups</span><h2 className="mt-3 font-semibold">Patient directory</h2><p className="mt-1 text-sm text-on-surface-variant">Find patients already linked to your clinics or register a new patient.</p></Link>
          </div>
        </>
      )}
    </WorkspaceLayout>
  );
}
