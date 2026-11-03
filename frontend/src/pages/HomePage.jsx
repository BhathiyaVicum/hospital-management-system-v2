import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SectionHeading from '../components/common/SectionHeading';
import { getAvailability, getClinics, getDoctors, getSpecialties } from '../services/api';

const specialtyPresentation = {
  cardiology: { icon: 'cardiology', color: 'bg-rose-50 text-rose-700', description: 'Heart & Vascular' },
  'primary-care': { icon: 'medical_services', color: 'bg-primary-container/15 text-primary', description: 'Preventive & Family' },
  dermatology: { icon: 'dermatology', color: 'bg-secondary-container text-secondary', description: 'Skin & Aesthetics' },
  pediatrics: { icon: 'child_care', color: 'bg-surface-container-high text-on-surface', description: 'Infant & Adolescent' },
  orthopedics: { icon: 'orthopedics', color: 'bg-surface-container-high text-on-surface', description: 'Joints & Spine' },
  gynecology: { icon: 'female', color: 'bg-rose-50 text-rose-700', description: "Women's Health & OB" },
};

const steps = [
  {
    title: 'Find a Doctor',
    description: 'Search by specialty, clinic, or location and explore verified practitioners across our care network.',
    detail: 'Approved Profiles',
    icon: 'verified_user',
  },
  {
    title: 'Choose a Time',
    description: 'Compare appointment options and choose a time that fits your schedule and preferred clinic.',
    detail: 'Flexible Scheduling',
    icon: 'sync',
  },
  {
    title: 'Confirm Instantly',
    description: 'Book your visit online and get the details you need to prepare for your appointment.',
    detail: 'Simple Confirmation',
    icon: 'sms',
  },
];

const popularSearches = [
  { label: 'Cardiologist', specialty: 'Cardiology' },
  { label: 'Same-Day Pediatrics', specialty: 'Pediatrics' },
  { label: 'Skin Check', specialty: 'Dermatology' },
  { label: 'Annual Physical', specialty: 'Primary Care' },
];

const fallbackClinics = [
  { icon: 'local_hospital', name: 'Metro Central', sub: 'Pavilion Health' },
  { icon: 'health_and_safety', name: 'Patient First', sub: 'Dedicated Care' },
  { icon: 'biotech', name: 'Northside Care', sub: 'Pediatrics & Family' },
  { icon: 'medical_information', name: 'Riverfront Health', sub: 'Primary Practice' },
  { icon: 'clinical_notes', name: 'Summit Institute', sub: 'Cardiovascular' },
  { icon: 'shield_with_heart', name: 'Apex Diagnostics', sub: 'Ambulatory Center' },
];

function localDateValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ specialty: '', clinic: '', date: localDateValue() });
  const [popularDoctorFilter, setPopularDoctorFilter] = useState('top-rated');
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [contentError, setContentError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getDoctors({ limit: 4 }), getSpecialties(), getClinics()])
      .then(async ([doctorResponse, specialtyResponse, clinicResponse]) => {
        if (!active) return;
        const listedDoctors = doctorResponse.data || [];
        setSpecialties(specialtyResponse.data || []);
        setClinics(clinicResponse.data || []);
        const availabilityResults = await Promise.allSettled(
          listedDoctors.map((doctor) => getAvailability(doctor.id)),
        );
        if (!active) return;
        const withAvailability = listedDoctors.map((doctor, index) => {
          const result = availabilityResults[index];
          const firstSlot = result.status === 'fulfilled' ? result.value.data?.slots?.[0] : null;
          return {
            ...doctor,
            nextAvailable: firstSlot ? `${firstSlot.day} · ${firstSlot.time}` : 'No upcoming availability',
            availableToday: Boolean(firstSlot && firstSlot.date === localDateValue()),
          };
        });
        setDoctors(withAvailability);
        setContentError(availabilityResults.some((result) => result.status === 'rejected')
          ? 'Some appointment availability could not be loaded.'
          : '');
      })
      .catch((error) => {
        if (active) setContentError(error.message || 'Unable to load current clinic and specialist listings.');
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleDoctors = [...doctors]
    .filter((doctor) => popularDoctorFilter !== 'available' || doctor.availableToday)
    .sort((first, second) => (
    popularDoctorFilter === 'top-rated' ? Number(second.rating) - Number(first.rating) : 0
    ));

  const updateSearch = (event) => {
    const { name, value } = event.target;
    setSearch((current) => ({ ...current, [name]: value }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.specialty.trim()) params.set('specialty', search.specialty.trim());
    if (search.clinic) params.set('location', search.clinic);
    if (search.date) params.set('date', search.date);
    navigate(`/doctors${params.size ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="min-w-0 bg-surface">
      <section className="relative overflow-hidden bg-surface-container-low py-12 sm:py-16 lg:py-24">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-secondary-container/40 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-surface-container-lowest px-4 py-2 shadow-sm">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-primary sm:text-xs sm:tracking-[0.12em]">
                    Real-Time Clinical Availability
                  </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-on-surface [text-wrap:balance] sm:text-5xl lg:text-6xl">
                  Find trusted clinical specialists &amp; book verified care in minutes.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
                  Browse available medical professionals and clinics. Compare current schedules, specialties, and consultation fees, then request an appointment online.
                </p>
              </div>

              {/* Quick Trust Metrics Strip */}
              <div className="grid max-w-lg grid-cols-3 gap-2 pt-2 sm:gap-4">
                <div className="rounded-lg bg-surface-container-lowest p-3 shadow-sm sm:p-4">
                  <p className="text-xl font-semibold text-primary sm:text-2xl">120+</p>
                  <p className="mt-1 text-[11px] leading-snug text-on-surface-variant sm:text-xs">
                    Specialist Doctors
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container-lowest p-3 shadow-sm sm:p-4">
                  <p className="text-xl font-semibold text-primary sm:text-2xl">99.4%</p>
                  <p className="mt-1 text-[11px] leading-snug text-on-surface-variant sm:text-xs">
                    Patient Satisfaction
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container-lowest p-3 shadow-sm sm:p-4">
                  <p className="text-xl font-semibold text-primary sm:text-2xl">&lt; 15 min</p>
                  <p className="mt-1 text-[11px] leading-snug text-on-surface-variant sm:text-xs">
                    Avg. Wait Time
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-2 px-1 pb-8 pt-5 sm:mx-4 sm:px-2">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-surface-container shadow-xl">
                  <img
                    className="h-full w-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0xbJrTgBm1BTTCLtJfi49Wi5KM3jw3ZM0P32YfavRKyJqkUDygDpVq-EmCC96OCacd0RMdUTZY0JShQ7a5-prC0fJdRkwBo5HJzIfAYJ4Iie_wp7vjt204apyFAR2I8GMuav92GTEQ3Xy9hz337zK78gMIysMOI2-HRyaIEYlOPShyTy4I-DLj9QhRrZRLgDGBMVaojPzvxAXars8mnDEpSa23tXyZj3p5sPj0r7l"
                    alt="A doctor speaking with a patient in a bright clinical consultation room"
                    fetchPriority="high"
                  />
                </div>
                <div className="absolute -bottom-1 left-0 flex max-w-[min(19rem,90%)] items-center gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-lg sm:-left-4 sm:p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/20 text-primary">
                    <span className="material-symbols-outlined text-[26px]">verified</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-on-surface">Accredited Network</span>
                    <span className="mt-0.5 block text-xs leading-snug text-on-surface-variant">Board certified &amp; audited clinical care</span>
                  </span>
                </div>
                <div className="absolute right-0 top-2 inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-2 shadow-md sm:-right-3">
                  <span className="material-symbols-outlined text-lg text-primary">event_available</span>
                  <span className="text-xs font-medium text-on-surface sm:text-sm">Today: 42 Open Slots</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-2xl bg-surface-container-lowest p-4 shadow-xl sm:mt-16 sm:p-6">
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 xl:items-end" onSubmit={submitSearch}>
              <div className="flex min-w-0 flex-col gap-2 xl:col-span-4">
                <label htmlFor="home-specialty" className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">stethoscope</span>
                  Doctor or Specialization
                </label>
                <input
                  id="home-specialty"
                  name="specialty"
                  type="search"
                  value={search.specialty}
                  onChange={updateSearch}
                  placeholder="e.g. Cardiology, Dr. Jenkins"
                  className="h-11 w-full min-w-0 rounded-lg bg-surface-container-low px-4 text-sm text-on-surface outline-none transition placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2 md:col-span-1 xl:col-span-3">
                <label htmlFor="home-clinic" className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                  Clinic / Location
                </label>
                <select
                  id="home-clinic"
                  name="clinic"
                  value={search.clinic}
                  onChange={updateSearch}
                  className="h-11 w-full min-w-0 rounded-lg bg-surface-container-low px-3 text-sm text-on-surface outline-none transition focus:bg-white focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Partner Clinics</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.name}>{clinic.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex min-w-0 flex-col gap-2 md:col-span-1 xl:col-span-3">
                <label htmlFor="home-date" className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">calendar_today</span>
                  Preferred Date
                </label>
                <input
                  id="home-date"
                  name="date"
                  type="date"
                  value={search.date}
                  onChange={updateSearch}
                  className="h-11 w-full min-w-0 rounded-lg bg-surface-container-low px-3 text-sm text-on-surface outline-none transition focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-2">
                <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container">
                  <span className="material-symbols-outlined text-xl">search</span>
                  Find Doctor
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs text-on-surface-variant">
              <span className="mr-1 font-semibold text-on-surface">Common searches:</span>
              {popularSearches.map(({ label, specialty }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSearch((current) => ({ ...current, specialty }))}
                  className="rounded-full bg-surface-container px-3 py-1.5 transition hover:bg-primary hover:text-on-primary"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Specializations — limited to 6 */}
      <section className="py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Department Coverage"
              title="Explore Popular Specialties"
              description="Explore specialties and available practitioners across our clinic network."
            />
            <Link to="/specialists" className="inline-flex w-fit shrink-0 items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-container">
              View All Specialties
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            {specialties.slice(0, 6).map((specialty) => {
              const presentation = specialtyPresentation[specialty.slug] || {
                icon: 'medical_services',
                color: 'bg-surface-container-high text-on-surface',
                description: specialty.description || 'Specialized care',
              };
              return (
              <Link
              key={specialty.id}
              to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`}
              className="group flex min-w-0 flex-col rounded-2xl bg-surface-container-lowest p-4 text-left shadow-sm transition hover:-translate-y-1 hover:bg-surface-container-high hover:shadow-md sm:p-5"
            >
              <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${presentation.color} transition group-hover:scale-105`}>
                <span className="material-symbols-outlined text-[26px]">{presentation.icon}</span>
                </span>
              <h3 className="text-sm font-semibold text-on-surface transition group-hover:text-primary sm:text-base">{specialty.name}</h3>
              <p className="mt-1 text-xs leading-snug text-on-surface-variant">{specialty.description || presentation.description}</p>
              <span className="mt-4 flex items-center justify-between gap-1 border-t border-slate-100 pt-3 text-xs font-medium text-primary">
                <span>{specialty.doctorCount} Doctors</span>
                <span className="material-symbols-outlined text-lg opacity-0 transition group-hover:opacity-100">chevron_right</span>
              </span>
            </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary sm:text-sm">
                <span className="material-symbols-outlined text-lg">verified</span>
                Approved Profiles &amp; Clear Pricing
              </span>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">Featured Medical Specialists</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
                Explore practitioner profiles, ratings, upcoming appointments, and consultation fees.
              </p>
            </div>
            <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-surface-container-lowest p-1 shadow-sm md:w-auto">
              {[
                ['top-rated', 'Top Rated'],
                ['available', 'Available Today'],
                ['all', 'All Specialists'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPopularDoctorFilter(value)}
                  aria-pressed={popularDoctorFilter === value}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                    popularDoctorFilter === value ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {contentError && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{contentError}</p>}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visibleDoctors.map((doctor) => (
              <article key={doctor.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition hover:shadow-lg">
                <div className="relative h-52 overflow-hidden bg-surface-container sm:h-56">
                  {doctor.image ? (
                    <img src={doctor.image} alt={doctor.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary" aria-hidden="true">
                      <span className="material-symbols-outlined text-7xl">person</span>
                    </div>
                  )}
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-primary shadow-sm">
                    <span className="material-symbols-outlined text-base text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {doctor.rating} ({doctor.reviews})
                  </div>
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-primary">In-Clinic</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
                  <div>
                    <div className="flex items-start gap-1.5">
                      <h3 className="text-base font-semibold leading-snug text-on-surface">{doctor.name}</h3>
                      <span className="material-symbols-outlined mt-0.5 text-lg text-primary" title="Verified practitioner">verified</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-primary">{doctor.specialties?.[0] || doctor.title}</p>
                    <div className="mt-3 space-y-2 text-xs text-on-surface-variant">
                      <p className="flex min-w-0 items-center gap-1.5">
                        <span className="material-symbols-outlined shrink-0 text-base text-primary">location_city</span>
                        <span className="truncate">{doctor.clinic}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-primary">
                        <span className="material-symbols-outlined shrink-0 text-base">schedule</span>
                        Next Slot: {doctor.nextAvailable}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">Consultation Fee</span>
                      <span className="font-semibold text-on-surface">{doctor.consultationFee} <span className="text-xs font-normal text-on-surface-variant">/ visit</span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link to={`/doctors/${doctor.id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-container px-3 text-sm font-medium text-on-surface transition hover:bg-surface-container-high">
                        Profile
                      </Link>
                      <Link to={`/doctors/${doctor.id}/book`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-on-primary transition hover:bg-primary-container">
                        Book Slot
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleDoctors.length === 0 && (
            <p className="rounded-xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
              {popularDoctorFilter === 'available' ? 'No featured doctors have openings today.' : 'No doctor profiles are currently available.'} View all specialists to explore more options.
            </p>
          )}
        </div>
      </section>

      <section className="py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Transparent Patient Care</span>
            <h2 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">How MediConnect Works</h2>
            <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
              Book trusted clinical consultations without lengthy telephone triage or complicated scheduling.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {steps.map((step, index) => (
              <article key={step.title} className="flex flex-col items-start rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition hover:shadow-md sm:p-6">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-on-primary shadow-sm">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold text-on-surface">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
                  <span className="material-symbols-outlined text-lg">{step.icon}</span>
                  {step.detail}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Governance + Left Stats Showcase */}
      <section className="bg-surface-container-low py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Stats Showcase */}
            <div className="space-y-6 lg:col-span-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Clinical Governance
                </span>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
                  High Standards for Safety, Privacy &amp; Specialist Care
                </h2>
                <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                  MediConnect strictly partners with vetted independent medical centers and certified
                  clinical specialists holding active state medical boards and hospital admitting
                  privileges.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-2xl">verified</span>
                    <span className="text-xl font-semibold text-on-surface">100%</span>
                  </div>
                  <p className="text-sm font-medium text-on-surface">Verified Credentials</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                    Primary-source verified licenses &amp; board certifications.
                  </p>
                </div>
                <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                    <span className="text-lg font-semibold text-on-surface">Patient First</span>
                  </div>
                  <p className="text-sm font-medium text-on-surface">Dedicated Care Standards</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                    Confidential consultations and patient-centered protocols.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Clinic Logos & Accreditation Wall */}
            <div className="space-y-4 lg:col-span-6">
              <div className="space-y-6 rounded-xl bg-surface-container-lowest p-5 shadow-md sm:p-7">
                <h3 className="text-lg font-semibold text-on-surface">
                  Accredited Partner Clinics &amp; Networks
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {clinics.length > 0
                    ? clinics.slice(0, 6).map((clinic) => (
                        <div
                          key={clinic.id}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-container-low p-4 text-center"
                        >
                          <span className="material-symbols-outlined text-[28px] text-primary">
                            local_hospital
                          </span>
                          <span className="text-xs font-medium text-on-surface">{clinic.name}</span>
                          <span className="text-[11px] leading-snug text-on-surface-variant">
                            {clinic.city}
                          </span>
                        </div>
                      ))
                    : fallbackClinics.map((c) => (
                        <div
                          key={c.name}
                          className="flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-container-low p-4 text-center"
                        >
                          <span className="material-symbols-outlined text-[28px] text-primary">
                            {c.icon}
                          </span>
                          <span className="text-xs font-medium text-on-surface">{c.name}</span>
                          <span className="text-[11px] leading-snug text-on-surface-variant">
                            {c.sub}
                          </span>
                        </div>
                      ))}
                </div>

                {/* Mini patient review snippet */}
                <div className="flex items-center gap-4 rounded-lg bg-surface-container-low p-4 pt-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-on-primary">
                    MK
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          star
                        </span>
                      ))}
                      <span className="ml-2 text-xs text-on-surface-variant">Verified Patient</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm italic text-on-surface">
                      “Booked Dr. Jenkins within 3 minutes and was in her clinic that afternoon. Flawless
                      experience.”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary py-10 text-on-primary sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">Are you an accredited private medical practice?</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-primary/80">
              Join the MediConnect clinical network to streamline patient bookings and make care easier to access.
            </p>
          </div>
          <Link to="/doctors" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest px-5 py-2.5 text-sm font-semibold text-primary shadow-md transition hover:bg-surface-container-high">
            Explore the Care Network
          </Link>
        </div>
      </section>

    </div>
  );
}