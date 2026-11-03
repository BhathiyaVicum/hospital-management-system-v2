import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../services/api';

const navigation = [
  { section: 'Overview', links: [['Dashboard', '/admin/dashboard', 'dashboard']] },
  { section: 'Patients & bookings', links: [
    ['Patients', '/admin/patients', 'groups'],
    ['Appointments', '/admin/appointments', 'calendar_month'],
  ] },
  { section: 'Providers & network', links: [
    ['Doctors', '/admin/doctors', 'stethoscope'],
    ['Schedules', '/admin/schedules', 'calendar_clock'],
    ['Clinics', '/admin/clinics', 'apartment'],
    ['Services & tariffs', '/admin/services', 'medical_services'],
  ] },
  { section: 'Team & security', links: [
    ['Staff', '/admin/staff', 'badge'],
    ['Receptionists', '/admin/receptionists', 'support_agent'],
    ['Support & inquiries', '/admin/support', 'forum'],
    ['Reports & analytics', '/admin/reports', 'monitoring'],
    ['Activity logs', '/admin/activity-logs', 'history'],
  ] },
];

function NavigationLinks({ onNavigate }) {
  return navigation.map((group) => (
    <div key={group.section} className="mb-4">
      <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{group.section}</p>
      <div className="space-y-1">
        {group.links.map(([label, to, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin/dashboard'}
            onClick={onNavigate}
            className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
              isActive ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  ));
}

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch((error) => { if (active && error.status !== 401) setLogoutError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logoutUser();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error.message || 'Unable to sign out.');
    } finally {
      setLoggingOut(false);
    }
  };

  const activeSection = navigation.flatMap((group) => group.links)
    .find(([, to]) => pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to)));

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-y-auto bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:flex">
        <Link to="/admin/dashboard" className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-6">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary"><span className="material-symbols-outlined">local_hospital</span></span>
            <span className="text-lg font-semibold tracking-tight">MediConnect</span>
          </span>
        </Link>
        <nav aria-label="Administrator navigation" className="flex-1 px-4 py-3"><NavigationLinks /></nav>
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">{(user?.name || 'Admin').slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name || 'Administrator'}</p><p className="text-xs text-on-surface-variant">System administrator</p></div>
          </div>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-error hover:bg-error-container/40 disabled:opacity-60">
            <span className="material-symbols-outlined">logout</span>{loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/45" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-surface-container-lowest shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <Link to="/admin/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 font-semibold"><span className="material-symbols-outlined text-primary">local_hospital</span>MediConnect HQ</Link>
              <button type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
            </div>
            <nav aria-label="Administrator navigation" className="flex-1 px-4 py-3"><NavigationLinks onNavigate={() => setMobileOpen(false)} /></nav>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="m-4 flex min-h-11 items-center gap-3 rounded-lg border-t border-slate-100 px-3 pt-3 text-sm font-semibold text-error">{loggingOut ? 'Signing out...' : 'Sign out'}</button>
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open admin navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-container lg:hidden"><span className="material-symbols-outlined">menu</span></button>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{activeSection?.[0] || 'Admin workspace'}</p><p className="hidden text-xs text-on-surface-variant sm:block">Administration · MediConnect</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden max-w-48 truncate text-sm text-on-surface-variant sm:block">{user?.email}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">{(user?.name || 'A').slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        {logoutError && <p role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6 lg:mx-8">{logoutError}</p>}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
