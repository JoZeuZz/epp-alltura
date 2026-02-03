import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TourRole, TourStep, onboardingStepsByRole, TOUR_VERSION } from '../utils/tourSteps';

type StopReason = 'completed' | 'skipped' | 'dismissed';
type TourMode = 'onboarding' | 'contextual';

interface TourContextValue {
  isActive: boolean;
  role: TourRole | null;
  steps: TourStep[];
  stepIndex: number;
  mode: TourMode;
  startOnboarding: (role: TourRole, options?: { force?: boolean }) => boolean;
  startContextual: (role: TourRole, steps: TourStep[]) => boolean;
  stop: (reason?: StopReason) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  restart: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const storageKeyFor = (role: TourRole) => `tour:${role}:${TOUR_VERSION}`;

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<TourRole | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TourMode>('onboarding');
  const [steps, setSteps] = useState<TourStep[]>([]);

  const startOnboarding = useCallback((nextRole: TourRole, options?: { force?: boolean }) => {
    if (!nextRole) return;
    const key = storageKeyFor(nextRole);
    const status = localStorage.getItem(key);
    if (!options?.force && (status === 'completed' || status === 'skipped')) {
      return false;
    }
    setMode('onboarding');
    setRole(nextRole);
    setSteps(onboardingStepsByRole[nextRole] || []);
    setStepIndex(0);
    setIsActive(true);
    localStorage.setItem(key, 'in_progress');
    return true;
  }, []);

  const startContextual = useCallback((nextRole: TourRole, contextualSteps: TourStep[]) => {
    if (!nextRole || contextualSteps.length === 0) return false;
    setMode('contextual');
    setRole(nextRole);
    setSteps(contextualSteps);
    setStepIndex(0);
    setIsActive(true);
    return true;
  }, []);

  const stop = useCallback((reason: StopReason = 'dismissed') => {
    if (role && mode === 'onboarding') {
      const key = storageKeyFor(role);
      if (reason === 'completed') {
        localStorage.setItem(key, 'completed');
      } else if (reason === 'skipped') {
        localStorage.setItem(key, 'skipped');
      }
    }
    setIsActive(false);
  }, [mode, role]);

  const next = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const prev = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setStepIndex(() => Math.min(Math.max(index, 0), Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const restart = useCallback(() => {
    if (!role) return;
    if (mode === 'onboarding') {
      const key = storageKeyFor(role);
      localStorage.setItem(key, 'in_progress');
    }
    setStepIndex(0);
    setIsActive(true);
  }, [mode, role]);

  const value = useMemo(
    () => ({
      isActive,
      role,
      steps,
      stepIndex,
      mode,
      startOnboarding,
      startContextual,
      stop,
      next,
      prev,
      goTo,
      restart,
    }),
    [isActive, role, steps, stepIndex, mode, startOnboarding, startContextual, stop, next, prev, goTo, restart]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
