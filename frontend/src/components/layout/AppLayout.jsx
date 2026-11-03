import { useLocation } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import SiteFooter from './SiteFooter';
import AdminLayout from '../admin/AdminLayout';

const HIDE_FOOTER_ROUTES = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) {
    return <AdminLayout>{children}</AdminLayout>;
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