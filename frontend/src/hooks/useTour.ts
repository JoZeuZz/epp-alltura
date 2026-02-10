import { useContext } from 'react';
import { TourContext } from '../context/tourContext.shared';

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
