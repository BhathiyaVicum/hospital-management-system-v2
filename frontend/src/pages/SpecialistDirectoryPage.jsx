import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDoctors, getSpecialties } from '../services/api';

export default function SpecialistDirectoryPage() {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [specialtyResponse, doctorResponse] = await Promise.all([
          getSpecialties(),
          getDoctors(),
        ]);

        setSpecialties(specialtyResponse.data || []);
        setDoctors(doctorResponse.data || []);
        setError('');
      } catch (loadError) {
        setError(loadError.message || 'Unable to load specialist listings.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="bg-surface pb-16">
      <section className="bg-surface-container-low py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="font-medium text-on-surface">Specialist directory</span>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Wellness network</p>
                <h2 className="mt-1 text-3xl font-semibold text-on-surface">Explore by specialty</h2>
              </div>
              <div className="rounded-full bg-surface-container px-3 py-1 text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                {specialties.length} care categories
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl bg-surface-container-lowest p-10 text-center ring-1 ring-slate-200">Loading specialists...</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700 ring-1 ring-red-200">{error}</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {specialties.map((specialty) => (
              <div key={specialty.id} className="rounded-2xl border border-slate-200 bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-slate-200">
                    <span className="material-symbols-outlined">medical_services</span>
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{specialty.doctorCount} docs</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-on-surface">{specialty.name}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{specialty.description}</p>
                <Link to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`} className="mt-4 inline-flex items-center text-sm font-semibold text-primary">View specialist list</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold text-on-surface">Featured physicians</h3>
          <Link to="/doctors" className="text-sm font-semibold text-primary">Browse all</Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {doctors.slice(0, 4).map((doctor) => (
            <Link key={doctor.id} to={`/doctors/${doctor.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-surface-container-lowest shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {doctor.image ? (
                <img src={doctor.image} alt={doctor.name} className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 items-center justify-center bg-surface-container text-primary" aria-hidden="true">
                  <span className="material-symbols-outlined text-7xl">person</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold text-on-surface">{doctor.name}</div>
                    <div className="text-sm text-primary">{doctor.specialties?.[0] || doctor.title}</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-surface-container px-2 py-1 text-xs font-medium text-on-surface">
                    <span className="material-symbols-outlined text-sm">star</span>
                    {doctor.rating}
                  </div>
                </div>
                <div className="mt-3 text-sm text-on-surface-variant">{doctor.location}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
