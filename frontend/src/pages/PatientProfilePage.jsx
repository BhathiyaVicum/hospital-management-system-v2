import { useEffect, useMemo, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import { getClinics, getPatientProfile, updatePatientProfile } from '../services/api';

const emptyProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  bloodType: '',
  homeAddress: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  preferredClinicId: '',
  preferredConsultationMode: '',
  preferredLanguage: '',
  wheelchairAccessible: false,
};

const relationshipOptions = [
  ['spouse', 'Spouse'],
  ['adult_child', 'Adult Child'],
  ['parent_guardian', 'Parent / Guardian'],
  ['sibling', 'Sibling'],
  ['healthcare_proxy', 'Designated Healthcare Proxy'],
  ['other', 'Other'],
];

function formValues(profile) {
  return {
    ...emptyProfile,
    ...profile,
    phone: profile.phone || '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile.gender || '',
    bloodType: profile.bloodType || '',
    homeAddress: profile.homeAddress || '',
    emergencyContactName: profile.emergencyContactName || '',
    emergencyContactRelationship: profile.emergencyContactRelationship || '',
    emergencyContactPhone: profile.emergencyContactPhone || '',
    preferredClinicId: profile.preferredClinicId || '',
    preferredConsultationMode: profile.preferredConsultationMode || '',
    preferredLanguage: profile.preferredLanguage || '',
    wheelchairAccessible: Boolean(profile.wheelchairAccessible),
  };
}

function patientAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-medium text-on-surface">{label}</span>{children}</label>;
}

const inputClass = 'h-11 w-full rounded-lg border border-slate-200 bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';

export default function PatientProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getPatientProfile(), getClinics()])
      .then(([profileResponse, clinicResponse]) => {
        if (!active) return;
        setProfile(formValues(profileResponse.data));
        setClinics(clinicResponse.data || []);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const completeness = useMemo(() => {
    const fields = [
      profile.firstName, profile.lastName, profile.phone, profile.dateOfBirth, profile.gender,
      profile.bloodType, profile.homeAddress, profile.emergencyContactName,
      profile.emergencyContactRelationship, profile.emergencyContactPhone,
      profile.preferredClinicId, profile.preferredConsultationMode, profile.preferredLanguage,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setProfile((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setNotice('');
  };

  const handleDiscard = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const { data } = await getPatientProfile();
      setProfile(formValues(data));
    } catch (requestError) {
      setError(requestError.message || 'Unable to reload your saved profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || null,
        dateOfBirth: profile.dateOfBirth || null,
        gender: profile.gender || null,
        homeAddress: profile.homeAddress || null,
        emergencyContactName: profile.emergencyContactName || null,
        emergencyContactRelationship: profile.emergencyContactRelationship || null,
        emergencyContactPhone: profile.emergencyContactPhone || null,
        preferredClinicId: profile.preferredClinicId || null,
        preferredConsultationMode: profile.preferredConsultationMode || null,
        preferredLanguage: profile.preferredLanguage || null,
      };
      const { data } = await updatePatientProfile(payload);
      setProfile(formValues(data));
      setNotice('Your profile changes have been saved.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading patient profile...</div>;

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PortalHeading
          eyebrow="Patient portal · My account"
          title="Patient Profile"
          description="Keep your contact details and care preferences up to date."
          actions={(
            <>
              <button type="button" onClick={handleDiscard} disabled={saving} className="min-h-11 rounded-xl border border-slate-200 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60">Discard Changes</button>
              <button type="submit" form="patient-profile-form" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"><span className="material-symbols-outlined text-lg">save</span>{saving ? 'Saving...' : 'Save Changes'}</button>
            </>
          )}
        />
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-primary-container/10 p-4 text-sm text-on-surface">
          <span className="material-symbols-outlined mt-0.5 text-primary">sync</span>
          <p>Profile information is saved securely to your patient record. Email changes and medical record updates must be handled through the support team.</p>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

        <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-2xl bg-surface-container-lowest p-5 text-center shadow-sm ring-1 ring-slate-200">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-on-primary">
                {`${profile.firstName[0] || ''}${profile.lastName[0] || ''}`.toUpperCase() || <span className="material-symbols-outlined">person</span>}
              </span>
              <h2 className="mt-3 font-semibold text-on-surface">{`${profile.firstName} ${profile.lastName}`.trim()}</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Patient account</p>
              {profile.gender && <p className="mt-2 text-xs text-on-surface-variant">{profile.gender.replaceAll('_', ' ')}</p>}
              {patientAge(profile.dateOfBirth) !== null && <p className="text-xs text-on-surface-variant">{patientAge(profile.dateOfBirth)} years old</p>}
              {profile.bloodType && <p className="mt-2 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Blood type · {profile.bloodType}</p>}
              <div className="mt-5 text-left">
                <div className="flex items-center justify-between text-xs"><span className="font-medium text-on-surface">Profile completeness</span><span className="font-semibold text-primary">{completeness}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness}%` }} /></div>
              </div>
            </section>
            <nav aria-label="Profile sections" className="rounded-2xl bg-surface-container-lowest p-3 shadow-sm ring-1 ring-slate-200">
              {[
                ['personal-information', 'Personal Information', 'person'],
                ['contact-information', 'Contact Information', 'contact_phone'],
                ['emergency-contact', 'Emergency Contact', 'emergency'],
                ['care-preferences', 'Care Preferences', 'tune'],
              ].map(([id, label, icon]) => (
                <a key={id} href={`#${id}`} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-primary">
                  <span className="material-symbols-outlined text-lg">{icon}</span>{label}
                </a>
              ))}
            </nav>
          </aside>

          <form id="patient-profile-form" onSubmit={handleSave} className="space-y-5">
            <section id="personal-information" className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">01 · Patient record</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Personal Information</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Legal First Name"><input name="firstName" value={profile.firstName} onChange={updateField} maxLength={60} className={inputClass} required autoComplete="given-name" /></Field>
                <Field label="Legal Last Name"><input name="lastName" value={profile.lastName} onChange={updateField} maxLength={60} className={inputClass} required autoComplete="family-name" /></Field>
                <Field label="Date of Birth"><input type="date" name="dateOfBirth" value={profile.dateOfBirth} onChange={updateField} className={inputClass} /></Field>
                <Field label="Gender">
                  <select name="gender" value={profile.gender} onChange={updateField} className={inputClass}>
                    <option value="">Select an option</option><option value="female">Female</option><option value="male">Male</option>
                  </select>
                </Field>
                <Field label="Blood Type (read-only)">
                  <input value={profile.bloodType || 'Not recorded'} readOnly className={`${inputClass} cursor-not-allowed bg-surface-container text-on-surface-variant`} />
                  <input type="hidden" name="bloodType" value={profile.bloodType} />
                </Field>
              </div>
            </section>

            <section id="contact-information" className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">02 · How to reach you</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Contact Information</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email Address"><input type="email" value={profile.email} readOnly className={`${inputClass} cursor-not-allowed bg-surface-container text-on-surface-variant`} /><span className="mt-1 block text-xs text-on-surface-variant">To change your email, contact support so your new address can be verified.</span></Field>
                <Field label="Mobile Phone Number"><input type="tel" name="phone" value={profile.phone} onChange={updateField} maxLength={32} autoComplete="tel" className={inputClass} /></Field>
                <Field label="Primary Home Address" className="sm:col-span-2"><input name="homeAddress" value={profile.homeAddress} onChange={updateField} maxLength={500} autoComplete="street-address" className={inputClass} /></Field>
              </div>
            </section>

            <section id="emergency-contact" className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">03 · In case of emergency</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Emergency Contact</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact Name"><input name="emergencyContactName" value={profile.emergencyContactName} onChange={updateField} maxLength={120} className={inputClass} /></Field>
                <Field label="Relationship">
                  <select name="emergencyContactRelationship" value={profile.emergencyContactRelationship} onChange={updateField} className={inputClass}>
                    <option value="">Select relationship</option>{relationshipOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Primary Phone"><input type="tel" name="emergencyContactPhone" value={profile.emergencyContactPhone} onChange={updateField} maxLength={32} className={inputClass} /></Field>
              </div>
            </section>

            <section id="care-preferences" className="scroll-mt-24 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">04 · Your care preferences</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Clinical &amp; Appointment Preferences</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred Primary Clinic">
                  <select name="preferredClinicId" value={profile.preferredClinicId} onChange={updateField} className={inputClass}>
                    <option value="">No preferred clinic</option>{clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}{clinic.city ? ` (${clinic.city})` : ''}</option>)}
                  </select>
                </Field>
                <Field label="Primary Care Language"><input name="preferredLanguage" value={profile.preferredLanguage} onChange={updateField} maxLength={80} className={inputClass} /></Field>
                <label className="flex min-h-11 items-center gap-3 self-end rounded-xl bg-surface-container-low px-4 py-3">
                  <input type="checkbox" name="wheelchairAccessible" checked={profile.wheelchairAccessible} onChange={updateField} className="h-4 w-4 accent-primary" />
                  <span className="text-sm font-medium text-on-surface">Wheelchair accessibility required</span>
                </label>
              </div>
              <div className="mt-5 flex justify-end">
                <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60">
                  <span className="material-symbols-outlined text-lg">save</span>{saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}
