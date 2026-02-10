import { createContext } from 'react';
import type { TourRole, TourStep } from '../utils/tourSteps';

export type StopReason = 'completed' | 'skipped' | 'dismissed';
export type TourMode = 'onboarding' | 'contextual';

export interface TourContextValue {
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

export const TourContext = createContext<TourContextValue | undefined>(undefined);
