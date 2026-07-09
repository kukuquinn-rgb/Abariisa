import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LivestockPage from './pages/LivestockPage';
import WorkersPage from './pages/WorkersPage';
import TasksPage from './pages/TasksPage';
import AttendancePage from './pages/AttendancePage';
import NotificationsPage from './pages/NotificationsPage';
import WorkerProfilePage from './pages/WorkerProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import ReportsPage from './pages/ReportsPage';

// Layout
import AppLayout from './components/layout/AppLayout';

// Route guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const ManagerRoute = ({ children }) => {
  const { user, loading, isManager } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to="/dashboard" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const OperatorRoute = ({ children }) => {
  const { user, loading, isManager, isViewOnly } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isManager || isViewOnly) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const HomeRedirect = () => {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

    {/* Protected routes */}
    <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
      <Route index element={<HomeRedirect />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="livestock" element={<LivestockPage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="workers" element={<ManagerRoute><WorkersPage /></ManagerRoute>} />
      <Route path="workers/:id" element={<ManagerRoute><WorkerProfilePage /></ManagerRoute>} />
      <Route path="collaborators" element={<OperatorRoute><CollaboratorsPage /></OperatorRoute>} />
      <Route path="reports" element={<ManagerRoute><ReportsPage /></ManagerRoute>} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
