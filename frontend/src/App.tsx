import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { TourProvider } from './context/TourContext';
import { router } from './router';

// Servicios
import { notificationService } from './services/notificationService';
import { performanceService } from './services/performanceService';

const AppContent: React.FC = () => {
  useEffect(() => {
    // MODO DESARROLLO: Desregistrar service workers existentes
    notificationService.unregisterAll();
    
    // Inicializar notificaciones push
    // TEMPORALMENTE DESACTIVADO: notificationService.initialize();
    
    // Inicializar métricas de performance
    performanceService.initialize();
  }, []);

  return null; // Este componente solo maneja efectos
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TourProvider>
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
