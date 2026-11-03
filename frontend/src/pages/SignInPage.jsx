import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(location.state?.message || '');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const { user } = await loginUser(form);
      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        const from = location.state?.from;
        const requestedPath = from?.pathname || '';
        const rolePrefixes = {
          admin: '/admin/',
          doctor: '/doctor/',
          receptionist: '/receptionist/',
          staff: '/staff/',
        };
        const canReturnTo = from && (user.role === 'patient'
          ? requestedPath === '/dashboard' || requestedPath.startsWith('/appointments')
            || requestedPath.startsWith('/profile') || requestedPath.startsWith('/support')
            || (requestedPath.startsWith('/doctors/') && requestedPath.endsWith('/book'))
          : Boolean(rolePrefixes[user.role] && requestedPath.startsWith(rolePrefixes[user.role])));
        if (canReturnTo) {
          navigate({ pathname: from.pathname, search: from.search || '', hash: from.hash || '' }, { replace: true });
        } else if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'patient') {
          navigate('/dashboard', { replace: true });
        } else if (user.role === 'staff') {
          navigate('/staff/support', { replace: true });
        } else if (user.role === 'doctor') {
          navigate('/doctor/dashboard', { replace: true });
        } else if (user.role === 'receptionist') {
          navigate('/receptionist/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (error) {
      setMessage(error.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface py-6 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_20px_50px_rgba(8,15,25,0.08)] ring-1 ring-slate-200 sm:rounded-3xl">        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.4fr]">
          {/* Left branding panel - desktop only */}
          <div className="hidden lg:block bg-gradient-to-br from-primary via-primary-container to-surface-tint p-8 text-on-primary">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <span className="material-symbols-outlined">local_hospital</span>
              </span>
              <span className="text-2xl font-semibold tracking-tight">MediConnect</span>
            </div>
            <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight">
              Your care hub, completely synchronized
            </h1>
            <p className="mt-4 max-w-sm text-base text-on-primary/85">
              Unified clinical scheduling, secure follow-ups, and rapid access to care for modern healthcare journeys.
            </p>
          </div>

          {/* Form panel */}
          <div className="min-w-0 p-5 sm:p-6 lg:p-10">
            <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</div>
                <h2 className="mt-1 sm:mt-5 text-2xl sm:text-3xl font-semibold text-on-surface">Sign in</h2>
              </div>
              <span className="hidden xs:flex sm:flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">account_circle</span>
              </span>
            </div>

            {message ? (
              <div className="mb-4 rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">{message}</div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mt-6 sm:mt-8 mb-6 sm:mb-8 py-2 sm:py-3">
              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium text-on-surface">Email address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    mail
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-3 sm:py-3.5 pl-10 pr-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                  <label className="text-sm font-medium text-on-surface">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-primary">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 bg-surface-container-lowest py-3 sm:py-3.5 pl-10 pr-10 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors flex items-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 sm:mt-6 text-center text-sm text-on-surface-variant">
              New to MediConnect?{' '}
              <Link to="/register" className="font-semibold text-primary">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}