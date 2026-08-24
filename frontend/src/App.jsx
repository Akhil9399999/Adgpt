import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import AdGenerator from './pages/AdGenerator';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { currentUser, userProfile, profileLoading } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (profileLoading) return null;
  if (userProfile?.role !== 'admin') return <Navigate to="/ad-generator" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/ad-generator" element={<PrivateRoute><AdGenerator /></PrivateRoute>} />
          <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}