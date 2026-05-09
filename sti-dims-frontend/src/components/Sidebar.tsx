// src/components/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, AlertTriangle,
  Briefcase, LogOut, X, ChevronRight
} from 'lucide-react';

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',   exact: true },
  { to: '/students',    icon: Users,           label: 'Students'               },
  { to: '/violations',  icon: AlertTriangle,   label: 'Violations'             },
  { to: '/deployments', icon: Briefcase,       label: 'Deployments'            },
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-navy-900 border-r border-navy-800
        flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5">
            <img
              src="/assets/images/sti-logo.png"
              alt="STI Logo"
              className="w-10 h-auto object-contain"
            />
          </div>

          <div>
            <p className="font-display font-bold text-white text-sm leading-tight">
              STI DIMS
            </p>
            <p className="text-xs text-slate-500 leading-tight">
              Discipline Information Management System
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-navy-800 text-slate-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
               ${isActive
                 ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                 : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-gold-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-gold-500/50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-navy-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-gold-400">
              {user?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}