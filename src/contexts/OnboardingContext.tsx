import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { COMPANY_TOURS, findTourForPath, TourId, TourMeta } from '@/lib/companyTours';

const STORAGE_PREFIX = 'sinapse-onboarding';

interface OnboardingContextValue {
  showWelcome: boolean;
  openWelcome: () => void;
  closeWelcome: (markSeen?: boolean) => void;
  startTour: (id: TourId) => void;
  startTourOfCurrentScreen: () => void;
  startFullTour: () => void;
  tours: TourMeta[];
  currentScreenTour: TourMeta | null;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const driverRef = useState<{ instance: Driver | null }>({ instance: null })[0];

  const seenKey = user?.id ? `${STORAGE_PREFIX}-welcome-${user.id}` : null;

  // Auto-open welcome on first visit to /company/* for this user
  useEffect(() => {
    if (!user?.id || !seenKey) return;
    if (!location.pathname.startsWith('/company')) return;
    const seen = localStorage.getItem(seenKey);
    if (!seen) {
      // small delay so the page renders first
      const t = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(t);
    }
  }, [user?.id, seenKey, location.pathname]);

  const closeWelcome = useCallback(
    (markSeen = true) => {
      setShowWelcome(false);
      if (markSeen && seenKey) localStorage.setItem(seenKey, '1');
    },
    [seenKey]
  );

  const openWelcome = useCallback(() => setShowWelcome(true), []);

  const runDriver = useCallback((steps: any[]) => {
    if (driverRef.instance) {
      driverRef.instance.destroy();
    }
    const d = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 8,
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Concluir',
      progressText: '{{current}} de {{total}}',
      steps,
    });
    driverRef.instance = d;
    d.drive();
  }, [driverRef]);

  const startTour = useCallback(
    (id: TourId) => {
      const tour = COMPANY_TOURS.find((t) => t.id === id);
      if (!tour) return;
      // navigate first if needed
      if (!location.pathname.startsWith(tour.route)) {
        navigate(tour.route);
        // wait for navigation + render
        setTimeout(() => runDriver(tour.steps), 700);
      } else {
        runDriver(tour.steps);
      }
    },
    [location.pathname, navigate, runDriver]
  );

  const currentScreenTour = useMemo(() => findTourForPath(location.pathname), [location.pathname]);

  const startTourOfCurrentScreen = useCallback(() => {
    if (currentScreenTour) runDriver(currentScreenTour.steps);
  }, [currentScreenTour, runDriver]);

  // Full guided tour: chains all tours back-to-back
  const startFullTour = useCallback(() => {
    let idx = 0;
    const runNext = () => {
      if (idx >= COMPANY_TOURS.length) return;
      const tour = COMPANY_TOURS[idx++];
      const launch = () => {
        if (driverRef.instance) driverRef.instance.destroy();
        const d = driver({
          showProgress: true,
          animate: true,
          smoothScroll: true,
          allowClose: true,
          overlayOpacity: 0.55,
          stagePadding: 6,
          stageRadius: 8,
          nextBtnText: 'Próximo →',
          prevBtnText: '← Anterior',
          doneBtnText: idx === COMPANY_TOURS.length ? 'Concluir tour' : 'Próxima tela →',
          progressText: `${tour.label} • {{current}} de {{total}}`,
          steps: tour.steps,
          onDestroyed: () => {
            // when user closes manually we stop chain
          },
          onDestroyStarted: () => {
            // continue chain only if reached the end
            const active = (d as any).getActiveIndex?.() ?? 0;
            const total = (d as any).getSteps?.()?.length ?? tour.steps.length;
            d.destroy();
            if (active >= total - 1) {
              setTimeout(runNext, 400);
            }
          },
        });
        driverRef.instance = d;
        d.drive();
      };
      if (!location.pathname.startsWith(tour.route)) {
        navigate(tour.route);
        setTimeout(launch, 750);
      } else {
        launch();
      }
    };
    runNext();
  }, [location.pathname, navigate, driverRef]);

  // cleanup on unmount
  useEffect(() => () => {
    driverRef.instance?.destroy();
  }, [driverRef]);

  const value: OnboardingContextValue = {
    showWelcome,
    openWelcome,
    closeWelcome,
    startTour,
    startTourOfCurrentScreen,
    startFullTour,
    tours: COMPANY_TOURS,
    currentScreenTour,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
