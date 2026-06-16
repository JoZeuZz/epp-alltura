import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, NotificationProvider, TourProvider, performanceService, GlobalStyles } from '@jozeuzz/alltura-ui';
import { post } from './services/apiService';
import { onboardingStepsByRole, contextualStepsByRole, TOUR_VERSION } from './utils/tourSteps';
import { router } from './router';

const AppContent: React.FC = () => {
  useEffect(() => {
    performanceService.initialize();
  }, []);

  return null; // Este componente solo maneja efectos
};

function App() {
  return (
    <AuthProvider loginFn={(email, password) => post('/auth/login', { email, password })}>
      <GlobalStyles />
      <NotificationProvider>
        <TourProvider steps={onboardingStepsByRole} contextualSteps={contextualStepsByRole} version={TOUR_VERSION}>
          <Toaster
            position="top-right"
            reverseOrder={false}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <AppContent />
          <RouterProvider router={router} />
        </TourProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
