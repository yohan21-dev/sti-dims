// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import StudentsPage from '@/pages/Students';
import StudentDetailPage from '@/pages/StudentDetail';
import ViolationsPage from '@/pages/Violations';
import DeploymentsPage from '@/pages/Deployments';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="violations" element={<ViolationsPage />} />
        <Route path="deployments" element={<DeploymentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}