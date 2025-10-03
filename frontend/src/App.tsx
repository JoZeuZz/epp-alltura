import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import RootRedirect from './components/RootRedirect';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClientsPage from './pages/admin/ClientsPage';
import ProjectsPage from './pages/admin/ProjectsPage';
import UsersPage from './pages/admin/UsersPage';
import TechDashboard from './pages/technician/TechDashboard';
import ScaffoldsPage from './pages/admin/ScaffoldsPage';
import ProjectScaffoldsPage from './pages/technician/ProjectScaffoldsPage';
import NewScaffoldPage from './pages/technician/NewScaffoldPage';
import DisassembleScaffoldPage from './pages/technician/DisassembleScaffoldPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/technician/HistoryPage';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/tech/dashboard" />; // o una página de no autorizado
  return children;
};

const TechRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'technician') return <Navigate to="/admin/dashboard" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AppLayout />
              </AdminRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="scaffolds" element={<ScaffoldsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>
          <Route
            path="/tech"
            element={
              <TechRoute>
                <AppLayout />
              </TechRoute>
            }
          >
            <Route path="dashboard" element={<TechDashboard />} />
            <Route path="project/:projectId" element={<ProjectScaffoldsPage />} />
            <Route path="project/:projectId/new-scaffold" element={<NewScaffoldPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="scaffold/:scaffoldId/disassemble" element={<DisassembleScaffoldPage />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>
          <Route path="/" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
