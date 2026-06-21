import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, AlertTriangle,
  Briefcase, LogOut, X, Settings, Building2,
} from 'lucide-react';

const NAV_MAIN = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',   exact: true },
  { to: '/students',    icon: Users,           label: 'Students'               },
  { to: '/violations',  icon: AlertTriangle,   label: 'Violations'             },
  { to: '/deployments', icon: Briefcase,       label: 'Deployments'            },
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isDeptHead = user?.role === 'dept_head';
  const isAdmin    = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64
        bg-sti-blue-dark flex flex-col shadow-sidebar
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sti-blue-dark/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
              <img src="/assets/images/sti-logo.png" alt="STI" className="w-10 h-auto object-contain" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-sti-yellow rounded-full border-2 border-sti-blue" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm leading-tight">STI DIMS</p>
            <p className="text-white/50 text-[11px] leading-tight">Discipline Mgmt · Cubao</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {isDeptHead ? (
          <>
            <NavLink
              to="/dept-head"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                 ${isActive ? 'bg-sti-yellow text-sti-blue shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Briefcase size={17} className={isActive ? 'text-sti-blue' : 'opacity-70'} />
                  <span>Service Queue</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sti-blue" />}
                </>
              )}
            </NavLink>
            <NavLink
              to="/deployments"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                 ${isActive ? 'bg-sti-yellow text-sti-blue shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`
              }
            >
              {({ isActive }) => (
                <>
                  <LayoutDashboard size={17} className={isActive ? 'text-sti-blue' : 'opacity-70'} />
                  <span>All Deployments</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sti-blue" />}
                </>
              )}
            </NavLink>
            <div className="mx-3 my-2 border-t border-white/10" />
            <div className="px-3 py-2 flex items-center gap-2">
              <Building2 size={14} className="text-sti-yellow" />
              <span className="text-xs text-white/40 font-medium">Department Head</span>
            </div>
          </>
        ) : (
          NAV_MAIN.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                 ${isActive ? 'bg-sti-yellow text-sti-blue shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-sti-blue' : 'opacity-70'} />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sti-blue" />}
                </>
              )}
            </NavLink>
          ))
        )}

        {isAdmin && (
          <>
            <div className="mx-3 my-2 border-t border-white/10" />
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                 ${isActive ? 'bg-sti-yellow text-sti-blue shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Settings size={17} className={isActive ? 'text-sti-blue' : 'opacity-70'} />
                  <span>Admin Panel</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sti-blue" />}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-sti-blue-dark/60 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-sti-yellow flex items-center justify-center shrink-0 text-sti-blue font-bold text-sm">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-white/50 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}