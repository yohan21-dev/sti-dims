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
import AdminLayout          from '@/pages/admin/Admin';
import AdminViolationTypes  from '@/pages/admin/AdminViolationTypes';
import AdminUsers           from '@/pages/admin/AdminUsers';
import AdminAuditLog        from '@/pages/admin/AdminAuditLog';
import AdminBackup          from '@/pages/admin/AdminBackup';
import RegisterPage         from '@/pages/Register';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/assets/images/sti-logo.png" alt="STI" className="w-16 h-auto mb-1" />
          <div className="w-8 h-8 border-2 border-sti-blue/20 border-t-sti-blue rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading…</p>
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

      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/violation-types" replace />} />
          <Route path="violation-types" element={<AdminViolationTypes />} />
          <Route path="users"           element={<AdminUsers />} />
          <Route path="audit-log"       element={<AdminAuditLog />} />
          <Route path="backup"          element={<AdminBackup />} />
        </Route>
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