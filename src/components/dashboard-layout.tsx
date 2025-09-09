'use client';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Banknote, LayoutDashboard, Github, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const handleLogout = () => {
    localStorage.removeItem('userId');
    router.push('/login');
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Banknote className="text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-primary">WemaTrust</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={true}>
                <Link href="/">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="https://github.com/firebase/studio" target="_blank" rel="noopener noreferrer">
                  <Github />
                  View on GitHub
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} variant="outline">
                <LogOut />
                Logout
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 p-4 flex items-center justify-between md:hidden border-b bg-background/80 backdrop-blur-sm">
          <div className='flex items-center gap-4'>
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-md">
                <Banknote size={20} className="text-primary-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-primary">WemaTrust</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Dummy button for the header logout icon
function Button(props: any) {
  return <button {...props} />;
}
