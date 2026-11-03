import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAvailability, getClinics, getDoctors, getSpecialties } from '../services/api';

export default function PatientFindDoctorPage() {
  const [searchParams] = useSearchParams();
  
  const [filter, setFilter] = useState(() => ({
    search: searchParams.get('search') || '',
    specialty: searchParams.get('specialty') || '',
    location: searchParams.get('location') || '',
    date: searchParams.get('date') || '',
  }));
  
  const [submittedFilter, setSubmittedFilter] = useState(() => ({
    search: searchParams.get('search') || '',
    specialty: searchParams.get('specialty') || '',
    location: searchParams.get('location') || '',
    date: searchParams.get('date') || '',
  }));

  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([getClinics(), getSpecialties()])
      .then(([clinicsRes, specialtiesRes]) => {
        if (ignore) return;
        setClinics(clinicsRes.data || []);
        setSpecialties(specialtiesRes.data || []);
      })
      .catch(() => {
        if (!ignore) {
          setClinics([]);
          setSpecialties([]);
        }
      });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadDoctors() {
      try {
        setLoading(true);
        
        const response = await getDoctors({
          search: submittedFilter.search,
          specialty: submittedFilter.specialty,
          location: submittedFilter.location,
          limit: 20,
        });
        const listedDoctors = response.data || [];

        const doctorsWithAvailability = submittedFilter.date
          ? (await Promise.allSettled(
              listedDoctors.map(async (doctor) => {
                const availability = await getAvailability(doctor.id);
                const slot = availability.data?.slots?.find(
                  (item) => item.date === submittedFilter.date,
                );
                return {
                  ...doctor,
                  nextAvailable: slot ? `${slot.day} · ${slot.time}` : 'No openings on this date',
                  availableOnSelectedDate: Boolean(slot),
                };
              }),
            )).map((result, index) => {
              if (result.status === 'fulfilled') return result.value;
              return {
                ...listedDoctors[index],
                nextAvailable: 'Availability unavailable',
                availableOnSelectedDate: true,
              };
            })
          : listedDoctors.map((doctor) => ({
              ...doctor,
              nextAvailable: 'View profile for current openings',
              availableOnSelectedDate: true,
            }));

        if (!ignore) {
          setDoctors(doctorsWithAvailability.filter((d) => d.availableOnSelectedDate));
          setError('');
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Unable to load doctors.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDoctors();
    return () => { ignore = true; };
  }, [submittedFilter]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFilter((current) => ({ ...current, [name]: value }));
  };

  const visibleDoctors = doctors;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-on-surface sm:text-3xl">Find a doctor</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Search specialists and book your next appointment.
        </p>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
        <form
          className="grid gap-4 md:grid-cols-12 md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedFilter(filter);
          }}
        >
          <div className="md:col-span-3">
            <label htmlFor="patient-search" className="mb-2 block text-sm font-medium text-on-surface">
              Doctor name
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant">search</span>
              <input
                id="patient-search"
                type="text"
                name="search"
                value={filter.search}
                onChange={handleInputChange}
                placeholder="e.g. Dr. Jenkins"
                className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-3 pl-10 pr-4 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="patient-specialty" className="mb-2 block text-sm font-medium text-on-surface">
              Specialty
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant">stethoscope</span>
              <select
                id="patient-specialty"
                name="specialty"
                value={filter.specialty}
                onChange={handleInputChange}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-surface-container-lowest py-3 pl-10 pr-9 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">All Specialties</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.name}>{spec.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-on-surface-variant">expand_more</span>
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="patient-clinic" className="mb-2 block text-sm font-medium text-on-surface">
              Clinic / Location
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant">location_on</span>
              <select
                id="patient-clinic"
                name="location"
                value={filter.location}
                onChange={handleInputChange}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-surface-container-lowest py-3 pl-10 pr-9 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">All Partner Clinics</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.name}>{clinic.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-on-surface-variant">expand_more</span>
            </div>
          </div>

          <div className="md:col-span-3 flex gap-2">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-on-surface">Select date</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant">calendar_month</span>
                <input
                  type="date"
                  name="date"
                  value={filter.date}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-3 pl-10 pr-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="h-[50px] w-[50px] flex items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm transition hover:bg-primary-container"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-on-surface sm:text-2xl">Available doctors</h2>
          <div className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
            {visibleDoctors.length} matches
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-surface-container-lowest p-10 text-center text-on-surface-variant ring-1 ring-slate-200">
            Loading specialist profiles...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-red-700 ring-1 ring-red-200">{error}</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {visibleDoctors.map((doctor) => (
              <div key={doctor.id} className="rounded-2xl border border-slate-200 bg-surface-container-lowest p-4 shadow-sm lg:p-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <img src={doctor.image} alt={doctor.name} className="h-32 w-32 rounded-2xl object-cover" />

                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-semibold text-on-surface">{doctor.name}</div>
                        <div className="text-sm text-primary">{doctor.title}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                      <span className="rounded-full bg-surface-container px-2.5 py-1">
                        {doctor.specialties?.join(', ') || 'Specialty not listed'}
                      </span>
                      <span className="rounded-full bg-surface-container px-2.5 py-1">{doctor.experience}</span>
                      <span className="rounded-full bg-surface-container px-2.5 py-1">{doctor.location}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">Next available:</span>{' '}
                        {doctor.nextAvailable}
                      </div>
                      <div className="text-lg font-semibold text-on-surface">{doctor.consultationFee}</div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Link 
                        to={`/dashboard/doctors/${doctor.id}/book`} 
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container"
                      >
                        Book visit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {visibleDoctors.length === 0 && (
              <p className="rounded-2xl bg-surface-container-lowest p-8 text-center text-on-surface-variant xl:col-span-2">
                No doctors match these filters. Try another specialty or clinic.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}