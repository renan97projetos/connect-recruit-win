import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CompanySidebar } from '@/components/CompanySidebar';

interface CompanyLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  /** Mantido por compatibilidade — não é mais usado visualmente. */
  area?: 'jobs' | 'hr';
  /** Conteúdo extra à direita do título no header (ex: botões de ação). */
  headerActions?: ReactNode;
}

export function CompanyLayout({ children, title, description, headerActions }: CompanyLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CompanySidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar compacta */}
          <header className="h-14 border-b border-border bg-background flex items-center gap-3 px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-base md:text-lg font-bold truncate leading-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-xs text-muted-foreground truncate hidden md:block">
                  {description}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>
            )}
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-x-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
