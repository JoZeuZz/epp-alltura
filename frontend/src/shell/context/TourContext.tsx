import React, { useCallback, useMemo, useState } from 'react';
import { TourRole, TourStep } from '../utils/tourSteps';
import { StopReason, TourMode, TourContext } from './tourContext.shared';

interface TourProviderProps {
  children: React.ReactNode;
  steps: Record<string, TourStep[]>;
  version: string;
}

const storageKeyFor = (role: TourRole, version: string) => `tour:${role}:${version}`;

export const TourProvider: React.FC<TourProviderProps> = ({ children, steps: stepsByRole, version }) => {
  const [role, setRole] = useState<TourRole | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TourMode>('onboarding');
  const [steps, setSteps] = useState<TourStep[]>([]);

  const startOnboarding = useCallback((nextRole: TourRole, options?: { force?: boolean }) => {
    if (!nextRole) return false;
    const key = storageKeyFor(nextRole, version);
    const status = localStorage.getItem(key);
    if (!options?.force && (status === 'completed' || status === 'skipped')) {
      return false;
    }
    setMode('onboarding');
    setRole(nextRole);
    setSteps(stepsByRole[nextRole] || []);
    setStepIndex(0);
    setIsActive(true);
    localStorage.setItem(key, 'in_progress');
    return true;
  }, [stepsByRole, version]);

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
      const key = storageKeyFor(role, version);
      if (reason === 'completed') {
        localStorage.setItem(key, 'completed');
      } else if (reason === 'skipped') {
        localStorage.setItem(key, 'skipped');
      }
    }
    setIsActive(false);
  }, [mode, role, version]);

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
      const key = storageKeyFor(role, version);
      localStorage.setItem(key, 'in_progress');
    }
    setStepIndex(0);
    setIsActive(true);
  }, [mode, role, version]);

  const value = useMemo(
    () => ({
      isActive,
      role,
      steps,
      stepIndex,
      mode,
      currentDemoAction: isActive ? (steps[stepIndex]?.demoAction ?? null) : null,
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
