import { ReactNode } from 'react';
import { CompanyTopNav } from '@/components/CompanyTopNav';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { OnboardingTourStyles } from '@/components/onboarding/OnboardingTourStyles';

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
    <OnboardingProvider>
      <OnboardingTourStyles />
      <div className="min-h-screen bg-[#f8f8f6] app-internal">
        <CompanyTopNav />
        <main className="px-4 md:px-6 py-6">{children}</main>
        <WelcomeModal />
      </div>
    </OnboardingProvider>
  );
}
