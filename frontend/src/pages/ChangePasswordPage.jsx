import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, getCurrentUser } from '../services/api';

function homeForRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'patient') return '/dashboard';
  if (role === 'staff') return '/staff/support';
  return '/';
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (values.newPassword !== values.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      const { user } = await getCurrentUser();
      navigate(homeForRole(user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to change your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container/15 text-primary"><span className="material-symbols-outlined">lock_reset</span></span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Account security</p>
        <h1 className="mt-1 text-2xl font-semibold text-on-surface">Change your password</h1>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Set a new password to continue. Use at least 12 characters and keep it private.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Current password</span><input type="password" name="currentPassword" autoComplete="current-password" value={values.currentPassword} onChange={update} required className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium">New password</span><input type="password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={128} value={values.newPassword} onChange={update} required className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Confirm new password</span><input type="password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={128} value={values.confirmPassword} onChange={update} required className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <button type="submit" disabled={loading} className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{loading ? 'Updating password...' : 'Update password'}</button>
        </form>
      </section>
    </div>
  );
}
