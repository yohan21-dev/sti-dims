import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import StudentsPage from '@/pages/Students';
import StudentDetailPage from '@/pages/StudentDetail';
import ViolationsPage from '@/pages/Violations';
import DeploymentsPage from '@/pages/Deployments';
import DeptHeadDashboard from '@/pages/DeptHeadDashboard';
import AdminLayout         from '@/pages/admin/Admin';
import AdminViolationTypes from '@/pages/admin/AdminViolationTypes';
import AdminDepartments    from '@/pages/admin/AdminDepartments';
import AdminUsers          from '@/pages/admin/AdminUsers';
import AdminAuditLog       from '@/pages/admin/AdminAuditLog';
import AdminBackup         from '@/pages/admin/AdminBackup';
import RegisterPage        from '@/pages/Register';
import ForgotPasswordPage from '@/pages/ForgotPassword';
import ResetPasswordPage  from '@/pages/ResetPassword';
import type { UserRole } from '@/types';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
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

  // If roles are specified and the user's role isn't in the list, redirect home
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  // After login, redirect dept_head straight to their queue
  const homeRedirect = user?.role === 'dept_head' ? '/dept-head' : '/';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeRedirect} replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage  />} />

      {/* ── Main app shell ── */}
      <Route
        path="/"
        element={
          <ProtectedRoute roles={['admin', 'officer', 'viewer']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students"         element={<StudentsPage />} />
        <Route path="students/:id"     element={<StudentDetailPage />} />
        <Route path="violations"       element={<ViolationsPage />} />
        <Route path="deployments"      element={<DeploymentsPage />} />
      </Route>

      {/* ── Department Head shell — same Layout, restricted nav ── */}
      <Route
        path="/dept-head"
        element={
          <ProtectedRoute roles={['dept_head']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DeptHeadDashboard />} />
      </Route>

      {/* Dept head can also reach the general deployments list (read-only actions hidden by role) */}
      <Route
        path="/deployments"
        element={
          <ProtectedRoute roles={['admin', 'officer', 'viewer', 'dept_head']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DeploymentsPage />} />
      </Route>

      {/* ── Admin panel ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/violation-types" replace />} />
          <Route path="violation-types" element={<AdminViolationTypes />} />
          <Route path="departments"     element={<AdminDepartments />} />
          <Route path="users"           element={<AdminUsers />} />
          <Route path="audit-log"       element={<AdminAuditLog />} />
          <Route path="backup"          element={<AdminBackup />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={homeRedirect} replace />} />
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