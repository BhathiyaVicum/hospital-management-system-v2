import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwMatch, setPwMatch] = useState(null);

  // ─── Password requirements (same as RegisterPage) ─────────────
  const requirements = {
    length: form.newPassword.length >= 12,
    upper: /[A-Z]/.test(form.newPassword),
    number: /[0-9]/.test(form.newPassword),
    special: /[!@#$%^&*]/.test(form.newPassword),
  };
  const allRequirementsMet = Object.values(requirements).every(Boolean);

  const handlePasswordChange = (event) => {
    const { value } = event.target;
    setForm((current) => {
      const updated = { ...current, newPassword: value };
      if (updated.confirmPassword) setPwMatch(updated.newPassword === updated.confirmPassword);
      return updated;
    });
  };

  const handleConfirmChange = (event) => {
    const { value } = event.target;
    setForm((current) => {
      const updated = { ...current, confirmPassword: value };
      setPwMatch(value ? updated.newPassword === value : null);
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!allRequirementsMet) {
      setMessage('Please meet all password requirements.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await resetPassword({ newPassword: form.newPassword });
      navigate('/login', { replace: true, state: { message: response.message } });
    } catch (error) {
      setMessage(error.message || 'Unable to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(8,15,25,0.08)] ring-1 ring-slate-200 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-primary shadow-sm">
            <span className="material-symbols-outlined text-4xl">key</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Security</div>
          <h1 className="mt-3 text-3xl font-semibold text-on-surface">Set a new password</h1>
          <p className="mt-3 text-sm text-on-surface-variant">
            Enter a new password that meets our security standards below.
          </p>
        </div>

        {message && (
          <div role="alert" className="mb-5 rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ─── Password + Confirm (side by side on sm+) ─── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {/* New password */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="new-password" className="block text-sm font-medium text-on-surface">
                New Password <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  autoComplete="new-password"
                  value={form.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 pl-3 pr-10 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 sm:py-3"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 flex items-center text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-on-surface">
                Confirm Password <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleConfirmChange}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 pl-3 pr-10 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 sm:py-3"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 flex items-center text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {pwMatch !== null && (
                <span
                  className={`flex items-center gap-1 text-xs ${pwMatch ? 'text-primary' : 'text-error'}`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {pwMatch ? 'check_circle' : 'error'}
                  </span>
                  {pwMatch ? 'Passwords match' : 'Passwords do not match'}
                </span>
              )}
            </div>
          </div>

          {/* ─── Password security standards ─── */}
          <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3 sm:p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Password Security Standards
            </span>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 pt-1 sm:grid-cols-2">
              {[
                { key: 'length', label: 'Minimum 12 characters' },
                { key: 'upper', label: 'At least 1 uppercase letter' },
                { key: 'number', label: 'At least 1 numerical digit' },
                { key: 'special', label: 'At least 1 special character (!@#$%^&*)' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className={`flex items-start gap-1.5 text-xs ${requirements[key] ? 'text-primary' : 'text-on-surface-variant'}`}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0 leading-4">
                    {requirements[key] ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="min-w-0">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary transition hover:bg-primary-container disabled:opacity-60"
          >
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-on-surface-variant">
          Back to <Link to="/login" className="font-semibold text-primary">sign in</Link>
        </div>
      </div>
    </div>
  );
}