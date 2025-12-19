import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { CompanySidebar } from '@/components/CompanySidebar';
import { Navbar } from '@/components/Navbar';

interface CompanyLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function CompanyLayout({ children, title, description }: CompanyLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CompanySidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              {title && (
                <div>
                  <h1 className="text-2xl font-bold">{title}</h1>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
