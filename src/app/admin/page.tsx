import { redirect } from 'next/navigation';
import { AdminLogsDashboard } from '@/components/admin-logs-dashboard';

export default function AdminPage() {
  // In a real app, you'd check authentication and admin privileges here
  const userId = 'admin'; // Simulate admin user
  
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <AdminLogsDashboard userId={userId} />
      </main>
    </div>
  );
}
