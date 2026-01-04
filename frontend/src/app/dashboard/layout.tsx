import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        {/* Sidebar is fixed, so we don't need to wrap it here, it handles its own positioning */}
        <Sidebar />
        
        {/* FIX: added 'ml-64' to push content right, so it doesn't go behind sidebar */}
        <main className="flex-1 ml-64 p-8 overflow-y-auto w-full relative">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}