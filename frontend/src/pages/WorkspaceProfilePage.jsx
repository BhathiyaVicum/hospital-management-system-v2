import { useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import {
  getDoctorWorkspaceProfile,
  getReceptionistProfile,
  updateDoctorWorkspaceProfile,
  updateReceptionistProfile,
} from '../services/api';

const emptyDoctor = {
  name: '', email: '', phone: '', title: '', bio: '', yearsOfExperience: '',
  education: '', languages: [], timeZone: 'UTC', image: '',
};
const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

export default function WorkspaceProfilePage({ role }) {
  const isDoctor = role === 'doctor';
  const [values, setValues] = useState(emptyDoctor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    (isDoctor ? getDoctorWorkspaceProfile() : getReceptionistProfile())
      .then(({ data }) => {
        if (active) setValues({ ...emptyDoctor, ...data, yearsOfExperience: data.yearsOfExperience ?? '', image: data.image || '' });
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isDoctor]);

  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (isDoctor) {
        await updateDoctorWorkspaceProfile({
          name: values.name,
          phone: values.phone || '',
          title: values.title,
          bio: values.bio || '',
          yearsOfExperience: values.yearsOfExperience === '' ? null : Number(values.yearsOfExperience),
          education: values.education || '',
          languages: Array.isArray(values.languages) ? values.languages : String(values.languages || '').split(',').map((item) => item.trim()).filter(Boolean),
          timeZone: values.timeZone,
          image: values.image || null,
        });
      } else {
        await updateReceptionistProfile({ name: values.name, phone: values.phone || '' });
      }
      setNotice('Profile saved successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout role={role}>
      <PortalHeading
        eyebrow={`${isDoctor ? 'Doctor' : 'Receptionist'} workspace · settings`}
        title="My profile"
        description={isDoctor ? 'Maintain your professional profile and contact details.' : 'Update your basic contact details. Your sign-in email is managed by an administrator.'}
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? <p className="py-12 text-center text-on-surface-variant">Loading your profile...</p> : (
        <form onSubmit={save} className="max-w-3xl rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Full name<input value={values.name} onChange={(event) => update('name', event.target.value)} className={inputClass} required maxLength={120} /></label>
            <label className="text-sm font-medium">Email address<input value={values.email} readOnly className={`${inputClass} bg-surface-container-low text-on-surface-variant`} /><span className="mt-1 block text-xs text-on-surface-variant">Contact an administrator to change your sign-in email.</span></label>
            <label className="text-sm font-medium">Phone<input value={values.phone || ''} onChange={(event) => update('phone', event.target.value)} className={inputClass} maxLength={32} /></label>
            {isDoctor && <>
              <label className="text-sm font-medium">Professional title<input value={values.title} onChange={(event) => update('title', event.target.value)} className={inputClass} required maxLength={120} /></label>
              <label className="text-sm font-medium">Years of experience<input type="number" min="0" max="80" value={values.yearsOfExperience} onChange={(event) => update('yearsOfExperience', event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium">Time zone<input value={values.timeZone} onChange={(event) => update('timeZone', event.target.value)} className={inputClass} required maxLength={80} /></label>
              <label className="text-sm font-medium">Profile image URL<input type="url" value={values.image || ''} onChange={(event) => update('image', event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium sm:col-span-2">Languages (comma-separated)<input value={Array.isArray(values.languages) ? values.languages.join(', ') : values.languages || ''} onChange={(event) => update('languages', event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium sm:col-span-2">Education<textarea value={values.education || ''} onChange={(event) => update('education', event.target.value)} rows={3} maxLength={2000} className={`${inputClass} h-auto`} /></label>
              <label className="text-sm font-medium sm:col-span-2">Professional overview<textarea value={values.bio || ''} onChange={(event) => update('bio', event.target.value)} rows={5} maxLength={5000} className={`${inputClass} h-auto`} /></label>
            </>}
          </div>
          <button type="submit" disabled={saving} className="mt-5 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Saving...' : 'Save profile'}</button>
        </form>
      )}
    </WorkspaceLayout>
  );
}
