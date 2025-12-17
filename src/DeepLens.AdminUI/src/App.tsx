import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TenantsPage from './pages/Tenants/TenantsPage';
import TenantDetailPage from './pages/Tenants/TenantDetailPage';
import UsersPage from './pages/Users/UsersPage';
import ImagesPage from './pages/Images/ImagesPage';
import SettingsPage from './pages/Settings/SettingsPage';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/tenants/:id" element={<TenantDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  );
}

export default App;
