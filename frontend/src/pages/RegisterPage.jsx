import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+1',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwMatch, setPwMatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const requirements = {
    length: form.password.length >= 12,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*]/.test(form.password),
  };

  const allRequirementsMet = Object.values(requirements).every(Boolean);

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (updated.confirmPassword) setPwMatch(updated.password === updated.confirmPassword);
      return updated;
    });
  };

  const handleConfirmChange = (event) => {
    const { value } = event.target;
    setForm((current) => {
      const updated = { ...current, confirmPassword: value };
      setPwMatch(value ? updated.password === value : null);
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    if (!allRequirementsMet) {
      setMessage('Please meet all password requirements.');
      setSubmitting(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      setSubmitting(false);
      return;
    }
    try {
      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: `${form.countryCode}${form.phone}`,
        password: form.password,
      };
      await registerUser(payload);
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (error) {
      setMessage(error.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface px-3 py-6 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl sm:rounded-3xl bg-surface-container-lowest shadow-[0_20px_50px_rgba(8,15,25,0.08)] ring-1 ring-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.4fr]">
          {/* Left branding panel - desktop only */}
          <div className="hidden lg:block bg-gradient-to-br from-primary via-primary-container to-surface-tint p-8 text-on-primary">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <span className="material-symbols-outlined">shield_with_heart</span>
              </span>
              <span className="text-2xl font-semibold tracking-tight">MediConnect</span>
            </div>
            <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight">Begin your care journey</h1>
            <p className="mt-4 max-w-sm text-base text-on-primary/85">
              Create a patient portal account to manage appointments, receive secure communications, and stay informed with the care team.
            </p>
          </div>

          {/* Form panel */}
          <div className="min-w-0 p-4 sm:p-6 lg:p-10">

            <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-semibold text-on-surface">Create account</h2>
              </div>
              <span className="hidden xs:flex sm:flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">person_add</span>
              </span>
            </div>

            {message ? (
              <div className="mb-4 rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">{message}</div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Legal name grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="block text-sm font-medium text-on-surface">
                    Legal First Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Sarah"
                    className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 sm:py-3 px-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="block text-sm font-medium text-on-surface">
                    Legal Last Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Jenkins"
                    className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 sm:py-3 px-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="block text-sm font-medium text-on-surface">
                  Email Address <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="sarah.jenkins@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 sm:py-3 pl-3 pr-10 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                  <div className="absolute right-3 pointer-events-none text-on-surface-variant flex items-center">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant">
                  We dispatch appointment summaries and telemedicine links to this address.
                </span>
              </div>

              {/* Mobile number */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="block text-sm font-medium text-on-surface">
                  Mobile Number <span className="text-error">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(555) 019-2834"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 sm:py-3 px-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="block text-sm font-medium text-on-surface">
                    Create Password <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handlePasswordChange}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 sm:py-3 pl-3 pr-10 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors flex items-center"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="block text-sm font-medium text-on-surface">
                    Confirm Password <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleConfirmChange}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-2.5 sm:py-3 pl-3 pr-10 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors flex items-center"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {pwMatch !== null && (
                    <span
                      className={`text-xs flex items-center gap-1 ${pwMatch ? 'text-primary' : 'text-error'}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {pwMatch ? 'check_circle' : 'error'}
                      </span>
                      {pwMatch ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  )}
                </div>
              </div>

              {/* Password security standards */}
              <div className="bg-surface-container-low rounded-xl p-3 sm:p-4 flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Password Security Standards
                </span>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
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
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary px-4 py-3 sm:py-3.5 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container"
              >
                {submitting ? 'Creating account...' : 'Register account'}
              </button>
            </form>

            <div className="mt-5 sm:mt-6 text-center text-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}