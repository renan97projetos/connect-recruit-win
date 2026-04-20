import { ReactNode } from 'react';
import { CompanyTopNav } from '@/components/CompanyTopNav';

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
    <div className="min-h-screen flex flex-col w-full bg-background">
      <CompanyTopNav />

      {(title || headerActions) && (
        <div className="border-b border-border bg-background">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              {title && (
                <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight truncate">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-x-auto w-full">
        {children}
      </main>
    </div>
  );
}
