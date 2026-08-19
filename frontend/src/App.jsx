import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { roleHome } from '../lib.js';

import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminHomePage from './pages/AdminHomePage.jsx';
import PropertiesPage from './pages/PropertiesPage.jsx';
import TenantsPage from './pages/TenantsPage.jsx';
import LeasesPage from './pages/LeasesPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

const LANDLORD_TENANT = ['landlord', 'tenant'];
const LANDLORD_ONLY = ['landlord'];
const ADMIN_ONLY = ['admin'];

function RoleHome() {
  const { user, status } = useAuth();
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={LANDLORD_TENANT}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-home"
          element={
            <ProtectedRoute roles={ADMIN_ONLY}>
              <AdminHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties"
          element={
            <ProtectedRoute roles={LANDLORD_ONLY}>
              <PropertiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute roles={LANDLORD_ONLY}>
              <TenantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={ADMIN_ONLY}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leases"
          element={
            <ProtectedRoute roles={LANDLORD_TENANT}>
              <LeasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute roles={LANDLORD_TENANT}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute roles={LANDLORD_TENANT}>
              <MaintenancePage />
            </ProtectedRoute>
          }
        />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<RoleHome />} />
      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
}
