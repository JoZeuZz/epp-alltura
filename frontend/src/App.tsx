import React, { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { TourProvider } from './context/TourContext';
import { router } from './router';

// Servicios
import { notificationService } from './services/notificationService';
import { performanceService } from './services/performanceService';

const extractBuildIdFromScripts = (): string => {
  if (typeof document === 'undefined') return '';

  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    const match = src.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js$/);
    if (match?.[1]) return match[1];
  }

  return '';
};

const BuildStamp: React.FC = () => {
  const buildId = useMemo(() => extractBuildIdFromScripts(), []);

  if (!buildId) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-2 right-2 z-[70] rounded-md bg-dark-blue/90 px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-white shadow-md"
      data-testid="build-stamp"
    >
      build {buildId.slice(0, 8)}
    </div>
  );
};

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
          <BuildStamp />
        </TourProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
