import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { LoadsPage } from './pages/loads/LoadsPage';
import { CarriersPage } from './pages/CarriersPage';
import { DriversPage } from './pages/DriversPage';
import { TrucksPage } from './pages/TrucksPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { UsersPage } from './pages/UsersPage';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { RoleGate } from './components/RoleGate';
import { useEffect } from 'react';

function App() {
  const token = useAuthStore((state) => state.token);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <LoginPage /> : <Navigate to="/" />} 
        />
        
        <Route
          path="/"
          element={token ? <AppLayout><Dashboard /></AppLayout> : <Navigate to="/login" />}
        />
        
        <Route
          path="/loads"
          element={token ? <AppLayout><LoadsPage /></AppLayout> : <Navigate to="/login" />}
        />

        <Route
          path="/carriers"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN']}>
                  <CarriersPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/drivers"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN']}>
                  <DriversPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/trucks"
          element={
            token ? (
              <AppLayout>
                <RoleGate allowedRoles={['ADMIN']}>
                  <TrucksPage />
                </RoleGate>
              </AppLayout>
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/users"
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
          path="/settings"
          element={token ? <AppLayout><ConfigurationPage /></AppLayout> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
