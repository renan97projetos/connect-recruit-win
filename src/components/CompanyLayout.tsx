import { ReactNode } from 'react';
import { CompanyTopNav } from '@/components/CompanyTopNav';

interface CompanyLayoutProps {
  children: ReactNode;
  /** Compatibilidade — não é mais usado visualmente. */
  title?: string;
  description?: string;
  area?: 'jobs' | 'hr';
  headerActions?: ReactNode;
}

export function CompanyLayout({ children }: CompanyLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <CompanyTopNav />
      <main className="px-4 md:px-6 py-6">{children}</main>
    </div>
  );
}
