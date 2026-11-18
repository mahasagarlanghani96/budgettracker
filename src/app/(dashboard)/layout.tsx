import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative z-10">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}
