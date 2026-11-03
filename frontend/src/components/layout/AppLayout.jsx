import { useLocation } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import SiteFooter from './SiteFooter';
import AdminLayout from '../admin/AdminLayout';
import PatientLayout from './PatientLayout';

const HIDE_FOOTER_ROUTES = [
  '/login', '/register', '/verify-email',
  '/forgot-password', '/reset-password',
];

function isDashboardPath(pathname) {
  return (
    pathname === '/dashboard' || pathname.startsWith('/dashboard/') ||
    pathname === '/appointments' || pathname.startsWith('/appointments/') ||
    pathname === '/profile' || pathname.startsWith('/profile/') ||
    pathname === '/support' || pathname.startsWith('/support/') ||
    pathname === '/staff/support' || pathname.startsWith('/staff/support/') ||
    pathname === '/change-password'
  );
}

export default function AppLayout({ children }) {
  const { pathname } = useLocation();

  // Public doctor browsing — always gets the marketing nav, never the
  // patient shell. Whitelisted explicitly so future edits to
  // isDashboardPath can't accidentally swallow it.
  if (pathname === '/doctors' || pathname.startsWith('/doctors/')) {
    return (
      <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col">
        <NavigationBar />
        <main className="flex-1 pt-20">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  if (pathname.startsWith('/admin')) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Doctor / receptionist routes render their own <WorkspaceLayout> higher
  // up in the tree, so we just pass children through.
  if (pathname.startsWith('/doctor') || pathname.startsWith('/receptionist')) {
    return children;
  }

  if (isDashboardPath(pathname)) {
    return <PatientLayout>{children}</PatientLayout>;
  }

  const hideFooter = HIDE_FOOTER_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col">
      <NavigationBar />
      <main className={`flex-1 pt-20 ${hideFooter ? 'flex items-center justify-center' : ''}`}>
        {children}
      </main>
      {!hideFooter && <SiteFooter />}
    </div>
  );
}