import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { LoadsPage } from './pages/loads/LoadsPage';
import { CarriersPage } from './pages/CarriersPage';
import { DriversPage } from './pages/DriversPage';
import { TrucksPage } from './pages/TrucksPage';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/useAuthStore';
import { ApplicationRedirect, ContingencyRedirect, NoShowRedirect } from './pages/redirects/EntityRedirects';

import { useThemeStore } from './store/useThemeStore';
import { RoleGate } from './components/RoleGate';
import { useEffect } from 'react';
import { usePushNotifications } from './hooks/usePushNotifications';
import { ChangePasswordPage } from './pages/ChangePasswordPage';

import { ConfigurationPage } from './pages/ConfigurationPage';

import { UsersPage } from './pages/UsersPage';
import { CarrierDocumentsPage } from './pages/CarrierDocumentsPage';
import { InvoicesPage } from './pages/InvoicesPage';

import { GroupsPage } from './pages/GroupsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import NotificationsPage from './pages/NotificationsPage';


function App() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  // Initialize push notifications when user is authenticated
  usePushNotifications(!!token);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Block navigation if the user is forced to change password
  if (token && user?.mustChangePassword) {
    return <ChangePasswordPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <LoginPage /> : <Navigate to="/" />} 
        />
        
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route
          path="/"
          element={
            token ? (
              user?.role === 'OPERATOR' || user?.role === 'PLAYERO' ? (
                <Navigate to="/loads" replace />
              ) : (
                <AppLayout><Dashboard /></AppLayout>
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        
        <Route
          path="/loads/:id?"
          element={token ? <AppLayout><LoadsPage /></AppLayout> : <Navigate to="/login" />}
        />

        <Route
          path="/notifications"
          element={token ? <AppLayout><NotificationsPage /></AppLayout> : <Navigate to="/login" />}
        />

        <Route
          path="/carriers/:id?"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN', 'OPERATOR', 'EMPLOYEE', 'LOGISTICS']}>
                  <CarriersPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/drivers/:id?"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN', 'OPERATOR', 'EMPLOYEE', 'CARRIER', 'LOGISTICS']}>
                  <DriversPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/trucks/:id?"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN', 'OPERATOR', 'EMPLOYEE', 'CARRIER', 'LOGISTICS']}>
                  <TrucksPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/users/:id?"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN']}>
                  <UsersPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />



        <Route
          path="/groups/:id?"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN']}>
                  <GroupsPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/documents"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN']}>
                  <CarrierDocumentsPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />


        <Route
          path="/invoices/:id?"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN', 'OPERATOR', 'EMPLOYEE', 'CARRIER']}>
                  <InvoicesPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />
        
        <Route
          path="/settings"
          element={token ? <AppLayout><ConfigurationPage /></AppLayout> : <Navigate to="/login" />}
        />

        {/* Redirect Routes for Sub-Entities */}
        <Route
          path="/applications/:id"
          element={token ? <AppLayout><ApplicationRedirect /></AppLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/contingencies/:id"
          element={token ? <AppLayout><ContingencyRedirect /></AppLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/noshows/:id"
          element={token ? <AppLayout><NoShowRedirect /></AppLayout> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
