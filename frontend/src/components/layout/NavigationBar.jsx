import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../services/api';

const publicNavigationItems = [
  { label: 'Find a Doctor', to: '/doctors' },
  { label: 'Services', to: '/specialists' },
  { label: 'How It Works', to: '/steps' },
  { label: 'Help', to: '/help' },
];

const patientNavigationItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'My Appointments', to: '/appointments' },
  { label: 'Find a Doctor', to: '/dashboard/find-doctor' },
  { label: 'Support', to: '/support' },
];

const staffNavigationItems = [
  { label: 'Support Queue', to: '/staff/support' },
];

const navLinkClass = ({ isActive }) => `rounded-lg px-4 py-2 text-base font-medium transition ${
  isActive
    ? 'bg-surface-container-high text-on-surface'
    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
}`;

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

export default function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpenedAt, setMenuOpenedAt] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileOpenedAt, setProfileOpenedAt] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState('');

  const closeMenu = () => setMenuOpen(false);
  const isMenuOpen = menuOpen && menuOpenedAt === location.pathname;
  const isProfileOpen = profileOpen && profileOpenedAt === location.pathname;

  const role = (user?.role || '').toLowerCase();
  const navigationItems = authLoading
    ? []
    : role === 'patient'
      ? patientNavigationItems
      : role === 'staff'
        ? staffNavigationItems
        : publicNavigationItems;

  // Fetch the current user ONCE on mount. Re-fetching on every route change
  // caused the nav to flip to "public" items mid-navigation and stick there
  // whenever the request failed (cold start, transient 401, etc).
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((response) => {
        if (active) setUser(response?.user ?? null);
      })
      .catch((error) => {
        if (!active) return;
        // Only clear on a real auth failure. Network errors / 5xx must NOT
        // wipe the nav — the user is still logged in.
        if (error?.status === 401) setUser(null);
        else console.error('Unable to load the signed-in user.', error);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Close profile menu on Escape or outside click
  useEffect(() => {
    if (!isProfileOpen) return;

    const onKey = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    const onClick = (e) => {
      if (!e.target.closest('[data-profile-menu]')) setProfileOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isProfileOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setAuthError('');
    try {
      await logoutUser();
      setUser(null);
      setProfileOpen(false);
      closeMenu();
      navigate('/');
    } catch (error) {
      setAuthError(error.message || 'Unable to sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:gap-6">
          <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
              <span className="material-symbols-outlined text-2xl">local_hospital</span>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-semibold tracking-tight text-on-surface sm:text-xl">
                Medi<span className="text-primary">Connect</span>
              </span>
              <span className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
                Clinical Healthcare
              </span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {navigationItems.map((item) => (
              <NavLink key={item.label} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {user ? (
            <div className="relative hidden sm:block" data-profile-menu>
              <button
                type="button"
                onClick={() => {
                  setProfileOpenedAt(location.pathname);
                  setProfileOpen(!isProfileOpen);
                }}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                aria-label="Open profile menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary shadow-sm ring-2 ring-transparent transition hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {initials(user.name)}
              </button>

              {isProfileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 w-64 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-xl"
                >
                  <div className="border-b border-slate-100 bg-surface-container-low/60 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-on-surface">{user.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to={role === 'patient' ? '/profile' : role === 'staff' ? '/staff/support' : '/'}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface transition hover:bg-surface-container"
                      role="menuitem"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">account_circle</span>
                      My Account
                    </Link>
                    {role === 'patient' && (
                      <Link
                        to="/appointments"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface transition hover:bg-surface-container"
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined text-[20px] text-primary">calendar_month</span>
                        My Appointments
                      </Link>
                    )}
                    <Link
                      to={role === 'patient' ? '/support' : '/staff/support'}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface transition hover:bg-surface-container"
                      role="menuitem"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">shield_person</span>
                      {role === 'patient' ? 'Help & Support' : 'Support Queue'}
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-error transition hover:bg-error-container/40 disabled:opacity-60"
                      role="menuitem"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      {loggingOut ? 'Signing out...' : 'Log Out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            !authLoading && (
              <Link
                to="/login"
                className="hidden rounded-lg px-4 py-2 text-base font-medium text-on-surface transition hover:bg-surface-container sm:inline-flex"
              >
                Log In
              </Link>
            )
          )}

          <Link
            to={role === 'staff' ? '/staff/support' : '/doctors'}
            aria-label={role === 'staff' ? 'Open support queue' : 'Book an appointment'}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container sm:px-4"
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span className="hidden sm:inline">
              {role === 'staff' ? 'Support Queue' : 'Book Appointment'}
            </span>
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container lg:hidden"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => {
              setMenuOpenedAt(location.pathname);
              setMenuOpen(!isMenuOpen);
            }}
          >
            <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-surface px-3 py-3 shadow-lg lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:px-3">
            {navigationItems.map((item) => (
              <NavLink key={item.label} to={item.to} onClick={closeMenu} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}

            {user ? (
              <>
                <div className="mt-2 flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{user.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                </div>
                <Link
                  to={role === 'patient' ? '/profile' : '/staff/support'}
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">account_circle</span>
                  My Account
                </Link>
                {role === 'patient' && (
                  <Link
                    to="/appointments"
                    onClick={closeMenu}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">calendar_month</span>
                    My Appointments
                  </Link>
                )}
                <Link
                  to={role === 'patient' ? '/support' : '/staff/support'}
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">shield_person</span>
                  {role === 'patient' ? 'Support' : 'Manage Tickets'}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-error hover:bg-error-container/40 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  {loggingOut ? 'Signing out...' : 'Log Out'}
                </button>
              </>
            ) : (
              !authLoading && (
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="rounded-lg px-4 py-2 text-base font-medium text-on-surface hover:bg-surface-container"
                >
                  Log In
                </Link>
              )
            )}
          </div>
        </nav>
      )}

      {authError && (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {authError}
        </p>
      )}
    </header>
  );
}