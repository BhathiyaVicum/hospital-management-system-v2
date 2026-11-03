import NavigationBar from './NavigationBar';

export default function PatientLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col">
      <NavigationBar />
      <main className="flex-1 pt-20">{children}</main>
    </div>
  );
}