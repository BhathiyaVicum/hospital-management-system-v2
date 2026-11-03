import { useCallback, useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import {
  getReceptionistClinics,
  getReceptionistPatients,
  registerReceptionistPatient,
  updateReceptionistPatient,
} from '../services/api';

const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

export default function ReceptionistPatientsPage() {
  const [clinics, setClinics] = useState([]);
  const [clinicId, setClinicId] = useState('');
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phone: '' });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      if (search.trim()) {
        const { data } = await getReceptionistPatients({ search: search.trim(), limit: 100 });
        setPatients(data || []);
      } else setPatients([]);
    } catch (requestError) {
      setError(requestError.message || 'Unable to search clinic patients.');
    }
  }, [search]);

  useEffect(() => {
    let active = true;
    getReceptionistClinics().then(({ data }) => {
      if (!active) return;
      setClinics(data || []);
      if (data?.length) setClinicId(data[0].id);
    }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load clinics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const register = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await registerReceptionistPatient({ ...newPatient, clinicId });
      setNotice(data.message);
      setNewPatient({ name: '', email: '', phone: '' });
      setShowNew(false);
      setSearch(data.name);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to register this patient.');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateReceptionistPatient(editing.id, { name: editing.name, phone: editing.phone || '' });
      setNotice('Patient contact details updated.');
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update patient contact information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout role="receptionist">
      <PortalHeading eyebrow="Reception workspace · patient services" title="Patient directory" description="Search patients connected to your assigned clinics, update contact details, and register new patients." actions={<button type="button" onClick={() => setShowNew(!showNew)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary">{showNew ? 'Close form' : 'Register patient'}</button>} />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? <p className="py-12 text-center text-on-surface-variant">Loading clinics...</p> : (
        <>
          {showNew && <form onSubmit={register} className="mb-5 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6"><h2 className="text-lg font-semibold">Register a patient</h2><p className="mt-1 text-sm text-on-surface-variant">An email verification link is sent to the patient. They can set a password using Forgot password after verification.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Clinic<select value={clinicId} onChange={(event) => setClinicId(event.target.value)} className={inputClass} required>{clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select></label><label className="text-sm font-medium">Full name<input value={newPatient.name} onChange={(event) => setNewPatient({ ...newPatient, name: event.target.value })} className={inputClass} required maxLength={120} /></label><label className="text-sm font-medium">Email address<input type="email" value={newPatient.email} onChange={(event) => setNewPatient({ ...newPatient, email: event.target.value })} className={inputClass} required maxLength={254} /></label><label className="text-sm font-medium">Phone<input value={newPatient.phone} onChange={(event) => setNewPatient({ ...newPatient, phone: event.target.value })} className={inputClass} maxLength={32} /></label></div><button type="submit" disabled={saving || !clinicId} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Registering...' : 'Register patient'}</button></form>}
          <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-sm font-medium">Search by name, email, or phone<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Enter at least one search term" className={inputClass} /></label><div className="self-end text-sm text-on-surface-variant">Clinic-scoped results: {patients.length}</div></div>
            {patients.length ? <div className="mt-4 space-y-3">{patients.map((patient) => (
              <article key={patient.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="font-semibold">{patient.name}</p><p className="mt-1 break-all text-sm text-on-surface-variant">{patient.email} · {patient.phone || 'No phone'}</p></div>
                <button type="button" onClick={() => setEditing({ id: patient.id, name: patient.name, phone: patient.phone || '' })} className="min-h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-primary">Edit contact</button>
              </article>
            ))}</div> : <p className="mt-4 rounded-xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">{search.trim() ? 'No patients were found for that search.' : 'Search by a patient name, email, or phone number.'}</p>}
          </section>
        </>
      )}
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3"><form onSubmit={saveContact} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-semibold">Update patient contact</h2><label className="mt-4 block text-sm font-medium">Full name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className={inputClass} required /></label><label className="mt-3 block text-sm font-medium">Phone<input value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} className={inputClass} /></label><p className="mt-2 text-xs text-on-surface-variant">Email is not editable here because it is also the patient’s verified sign-in identity.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Saving...' : 'Save contact'}</button></div></form></div>}
    </WorkspaceLayout>
  );
}
