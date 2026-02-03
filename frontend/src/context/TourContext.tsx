import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TourRole, TourStep, tourStepsByRole, TOUR_VERSION } from '../utils/tourSteps';

type StopReason = 'completed' | 'skipped' | 'dismissed';

interface TourContextValue {
  isActive: boolean;
  role: TourRole | null;
  steps: TourStep[];
  stepIndex: number;
  start: (role: TourRole, options?: { force?: boolean }) => void;
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

  const steps = useMemo(() => {
    return role ? tourStepsByRole[role] : [];
  }, [role]);

  const start = useCallback((nextRole: TourRole, options?: { force?: boolean }) => {
    if (!nextRole) return;
    const key = storageKeyFor(nextRole);
    const status = localStorage.getItem(key);
    if (!options?.force && (status === 'completed' || status === 'skipped')) {
      return;
    }
    setRole(nextRole);
    setStepIndex(0);
    setIsActive(true);
    localStorage.setItem(key, 'in_progress');
  }, []);

  const stop = useCallback((reason: StopReason = 'dismissed') => {
    if (role) {
      const key = storageKeyFor(role);
      if (reason === 'completed') {
        localStorage.setItem(key, 'completed');
      } else if (reason === 'skipped') {
        localStorage.setItem(key, 'skipped');
      }
    }
    setIsActive(false);
  }, [role]);

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
    const key = storageKeyFor(role);
    localStorage.setItem(key, 'in_progress');
    setStepIndex(0);
    setIsActive(true);
  }, [role]);

  const value = useMemo(
    () => ({
      isActive,
      role,
      steps,
      stepIndex,
      start,
      stop,
      next,
      prev,
      goTo,
      restart,
    }),
    [isActive, role, steps, stepIndex, start, stop, next, prev, goTo, restart]
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
