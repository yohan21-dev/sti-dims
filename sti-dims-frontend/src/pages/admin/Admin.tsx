import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, AlertTriangle, ScrollText, Settings, Download, Building2 } from 'lucide-react';

const TABS = [
  { to: '/admin/violation-types', icon: AlertTriangle,  label: 'Violation Types' },
  { to: '/admin/departments',     icon: Building2,       label: 'Departments'     },
  { to: '/admin/users',           icon: Users,           label: 'Users'           },
  { to: '/admin/audit-log',       icon: ScrollText,      label: 'Audit Log'       },
  { to: '/admin/backup',          icon: Download,        label: 'Backup & Export' },
];

export default function AdminLayout() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <Shield size={28} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-slate-800 text-lg">Access Denied</p>
          <p className="text-slate-500 text-sm mt-1">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sti-blue flex items-center justify-center shadow-btn">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="section-title">Admin Panel</h1>
          <p className="section-sub">System configuration and management</p>
        </div>
      </div>

      {/* Tab nav — scrollable on mobile */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-card overflow-x-auto">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
               ${isActive
                 ? 'bg-sti-blue text-white shadow-btn'
                 : 'text-slate-600 hover:text-sti-blue hover:bg-sti-blue-pale'}`
            }
          >
            <Icon size={14} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}