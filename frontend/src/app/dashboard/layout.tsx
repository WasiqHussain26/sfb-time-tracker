import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard'; // <--- Import the Guard we created

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* We wrap the entire dashboard in AuthGuard.
      If the user is NOT logged in, AuthGuard will redirect them 
      and render nothing (or a loading spinner), protecting the 
      Sidebar and Content from being seen.
    */
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar stays fixed on the left */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}