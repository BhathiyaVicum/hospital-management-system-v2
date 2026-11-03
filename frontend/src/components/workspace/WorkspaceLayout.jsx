import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../services/api';

const roleNavigation = {
  doctor: [
    ['Dashboard', '/doctor/dashboard', 'dashboard'],
    ['Appointments', '/doctor/appointments', 'calendar_month'],
    ['My schedule', '/doctor/schedules', 'calendar_clock'],
    ['My profile', '/doctor/profile', 'account_circle'],
  ],
  receptionist: [
    ['Dashboard', '/receptionist/dashboard', 'dashboard'],
    ['Appointments & check-in', '/receptionist/appointments', 'event_available'],
    ['Patient directory', '/receptionist/patients', 'groups'],
    ['My profile', '/receptionist/profile', 'account_circle'],
  ],
};

export default function WorkspaceLayout({ role, children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const navigation = roleNavigation[role] || [];
  const roleTitle = role === 'doctor' ? 'Clinical workspace' : 'Reception workspace';

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch((requestError) => { if (active && requestError.status !== 401) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const signOut = async () => {
    setLoggingOut(true);
    setError('');
    try {
      await logoutUser();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign out.');
    } finally {
      setLoggingOut(false);
    }
  };

  const links = (onNavigate) => navigation.map(([label, to, icon]) => (
    <NavLink
      key={to}
      to={to}
      end={to.endsWith('/dashboard')}
      onClick={onNavigate}
      className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
        isActive ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-surface-container-lowest shadow-sm lg:flex">
        <Link to={`/${role}/dashboard`} className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined">local_hospital</span>
          </span>
          <span className="text-lg font-semibold tracking-tight">MediConnect</span>
        </Link>
        <nav aria-label={`${role} navigation`} className="flex-1 space-y-1 px-4 py-4">{links()}</nav>
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
              {(user?.name || 'M').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name || 'MediConnect user'}</p>
              <p className="text-xs capitalize text-on-surface-variant">{role}</p>
            </div>
          </div>
          <button type="button" onClick={signOut} disabled={loggingOut} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-error hover:bg-error-container/40 disabled:opacity-60">
            <span className="material-symbols-outlined">logout</span>{loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/45" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface-container-lowest shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <Link to={`/${role}/dashboard`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined text-primary">local_hospital</span>MediConnect
              </Link>
              <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav aria-label={`${role} navigation`} className="flex-1 space-y-1 px-4 py-4">{links(() => setMobileOpen(false))}</nav>
            <button type="button" onClick={signOut} disabled={loggingOut} className="m-4 flex min-h-11 items-center gap-3 border-t border-slate-100 px-3 pt-3 text-sm font-semibold text-error">
              <span className="material-symbols-outlined">logout</span>{loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-container lg:hidden">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{navigation.find(([, to]) => pathname === to || pathname.startsWith(`${to}/`))?.[0] || roleTitle}</p>
              <p className="hidden text-xs text-on-surface-variant sm:block">{roleTitle} · MediConnect</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-52 truncate text-sm text-on-surface-variant sm:block">{user?.email}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">{(user?.name || 'M').slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        {error && <p role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6 lg:mx-8">{error}</p>}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
