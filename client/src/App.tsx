import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { onAuthChanged } from './lib/firebase';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import PetsPage from './pages/PetsPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import DeviceSimulatorPage from './pages/DeviceSimulatorPage';
import NotFoundPage from './pages/NotFoundPage';

import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingScreen from './components/ui/LoadingScreen';

export default function App() {
  const { initialized, setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthChanged((user) => {
      setUser(user);
      setInitialized(true);
    });
    return () => unsub();
  }, [setUser, setInitialized]);

  if (!initialized) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected dashboard */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pets" element={<PetsPage />} />
          <Route path="/tracking" element={<LiveTrackingPage />} />
          <Route path="/tracking/:petId" element={<LiveTrackingPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/simulator" element={<DeviceSimulatorPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
