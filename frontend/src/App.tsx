import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import RootRedirect from './components/RootRedirect';
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ClientsPage from './pages/admin/ClientsPage';
import ProjectsPage from './pages/admin/ProjectsPage';
import UsersPage from './pages/admin/UsersPage';
import ScaffoldsPage from './pages/admin/ScaffoldsPage';

// Supervisor Pages
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import ProjectScaffoldsPage from './pages/supervisor/ProjectScaffoldsPage';
import CreateScaffoldPage from './pages/supervisor/CreateScaffoldPage';
import DisassembleScaffoldPage from './pages/supervisor/DisassembleScaffoldPage';
import HistoryPage from './pages/supervisor/HistoryPage';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import ClientProjectScaffoldsPage from './pages/client/ClientProjectScaffoldsPage';

// Shared Pages
import ProfilePage from './pages/ProfilePage';
import UserFormPage from './pages/UserFormPage';

// Servicios
import { notificationService } from './services/notificationService';
import { performanceService } from './services/performanceService';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    // MODO DESARROLLO: Desregistrar service workers existentes
    notificationService.unregisterAll();
    
    // Inicializar notificaciones push
    // TEMPORALMENTE DESACTIVADO: notificationService.initialize();
    
    // Inicializar métricas de performance
    performanceService.initialize();
    
    // Por ahora no implementamos geolocalización
    // if (user?.role === 'supervisor') {
    //   navigator.geolocation?.getCurrentPosition(() => {}, () => {});
    // }
  }, [user]);

  return null; // Este componente solo maneja efectos
};

const ProtectedRoutes: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout />;
};

function App() {
  return (
    <AuthProvider>
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
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoutes />}>
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/clients" element={<ClientsPage />} />
            <Route path="/admin/projects" element={<ProjectsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/users/new" element={<UserFormPage />} />
            <Route path="/admin/users/edit/:id" element={<UserFormPage />} />
            <Route path="/admin/scaffolds" element={<ScaffoldsPage />} />
            <Route path="/admin/project/:projectId/create-scaffold" element={<CreateScaffoldPage />} />
            <Route path="/admin/profile" element={<ProfilePage />} />

            {/* Supervisor Routes */}
            <Route path="/supervisor/dashboard" element={<SupervisorDashboard />} />
            <Route path="/supervisor/project/:projectId" element={<ProjectScaffoldsPage />} />
            <Route path="/supervisor/project/:projectId/create-scaffold" element={<CreateScaffoldPage />} />
            <Route path="/supervisor/scaffold/:scaffoldId/disassemble" element={<DisassembleScaffoldPage />} />
            <Route path="/supervisor/history" element={<HistoryPage />} />
            <Route path="/supervisor/profile" element={<ProfilePage />} />

            {/* Client Routes */}
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/project/:projectId" element={<ClientProjectScaffoldsPage />} />
            <Route path="/client/profile" element={<ProfilePage />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
