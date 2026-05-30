import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Shield, Eye, UserCheck, UserX,
  Copy, Link as LinkIcon, RefreshCw, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import type { User, UserRole } from '@/types';

type UserWithMeta = User & {
  is_active: 0 | 1;
  created_at: string;
  last_login_at?: string;
};

const ROLES: UserRole[] = ['admin', 'officer', 'viewer'];

const ROLE_BADGE: Record<UserRole, string> = {
  admin:   'bg-red-100 text-red-700',
  officer: 'bg-sti-blue/10 text-sti-blue',
  viewer:  'bg-slate-100 text-slate-600',
};

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  admin:   <Shield size={12} />,
  officer: <UserCheck size={12} />,
  viewer:  <Eye size={12} />,
};

// ── Edit User Modal ───────────────────────────────────────────────────
function EditUserModal({
  user: target,
  onClose,
  onSuccess,
}: {
  user: UserWithMeta;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: target.full_name,
    email:     target.email,
    role:      target.role as UserRole,
    is_active: target.is_active === 1,
  });
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/admin/users/index.php?id=${target.id}`, {
      ...form,
      is_active: form.is_active ? 1 : 0,
      ...(newPassword ? { password: newPassword } : {}),
    }),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to update user'),
  });

  const isSelf = me?.id === target.id;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sti-blue flex items-center justify-center text-white font-bold">
              {target.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-display font-bold text-sti-blue text-base">Edit User</h2>
              <p className="text-xs text-slate-500">@{target.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="input-label">Full Name</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full" />
          </div>
          <div className="form-group">
            <label className="input-label">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                disabled={isSelf}
                className="w-full"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {isSelf && <p className="text-xs text-amber-600 mt-1">You cannot change your own role</p>}
            </div>
            <div className="form-group">
              <label className="input-label">Status</label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => !isSelf && setForm(f => ({ ...f, is_active: !f.is_active }))}
                  disabled={isSelf}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.is_active ? 'bg-green-500' : 'bg-slate-300'} disabled:opacity-50`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                <span className={`text-sm font-semibold ${form.is_active ? 'text-green-600' : 'text-slate-500'}`}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="input-label">New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
          >
            {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite Link Modal ─────────────────────────────────────────────────
function InviteLinkModal({ onClose }: { onClose: () => void }) {
  const [role, setRole]           = useState<UserRole>('officer');
  const [expiresHrs, setExpires]  = useState(48);
  const [link, setLink]           = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/admin/invite/index.php', { role, expires_hours: expiresHrs });
      const token = res.data.token as string;
      setLink(`${window.location.origin}/register?token=${token}`);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to generate invite');
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !generating && onClose()}>
      <div className="modal-panel max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sti-blue-pale flex items-center justify-center">
              <LinkIcon size={18} className="text-sti-blue" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sti-blue text-base">Generate Invite Link</h2>
              <p className="text-xs text-slate-500">Send to a new user to create their account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Role for New User</label>
              <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Link Expires In</label>
              <select value={expiresHrs} onChange={e => setExpires(Number(e.target.value))} className="w-full">
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>7 days</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <p className="font-semibold mb-0.5">Single-use link</p>
            <p className="text-xs">This link can only be used once. When the user registers, they'll set their own username and password.</p>
          </div>

          {link && (
            <div className="space-y-2">
              <label className="input-label text-green-700">✓ Invite Link Generated</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={link}
                  className="flex-1 text-xs bg-green-50 border-green-200 text-green-800 font-mono"
                />
                <button onClick={copy} className="btn-secondary flex items-center gap-1.5 text-sm px-3 shrink-0">
                  <Copy size={14} /> Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          <button
            onClick={generate}
            disabled={generating}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
          >
            {generating
              ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
              : <><RefreshCw size={15} /> {link ? 'Regenerate' : 'Generate Link'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing]     = useState<UserWithMeta | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      api.get('/admin/users/index.php').then(r => r.data.data as UserWithMeta[]),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: number }) =>
      api.patch(`/admin/users/index.php?id=${id}`, { is_active }),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/index.php?id=${id}`),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to delete'),
  });

  const users = data ?? [];
  const activeCount   = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">{activeCount} active · {inactiveCount} inactive</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="btn-primary flex items-center gap-1.5 text-sm self-start sm:self-auto"
        >
          <Plus size={15} /> Invite User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Users', value: users.length, color: 'text-sti-blue', bg: 'bg-sti-blue-pale border-blue-200' },
          { label: 'Active',      value: activeCount,  color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Inactive',    value: inactiveCount, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`card text-center py-3 border ${s.bg}`}>
            <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 className="mx-auto mb-3 text-sti-blue animate-spin" size={24} />
            <p className="text-slate-400 text-sm">Loading users…</p>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>User</th>
                <th className="hidden md:table-cell">Email</th>
                <th>Role</th>
                <th className="hidden lg:table-cell">Last Login</th>
                <th>Status</th>
                <th className="text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.is_active ? 'opacity-60' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${u.is_active ? 'bg-sti-blue' : 'bg-slate-400'}`}>
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{u.full_name}</p>
                        <p className="text-xs text-slate-400">@{u.username} {u.id === me?.id && <span className="text-sti-blue font-semibold">· you</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell text-sm text-slate-500">{u.email}</td>
                  <td>
                    <span className={`badge flex items-center gap-1 w-fit ${ROLE_BADGE[u.role as UserRole]}`}>
                      {ROLE_ICON[u.role as UserRole]}
                      {u.role}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell text-sm text-slate-500">
                    {u.last_login_at
                      ? <span className="flex items-center gap-1"><Clock size={11} />{format(parseISO(u.last_login_at), 'MMM d, yyyy')}</span>
                      : <span className="text-slate-300">Never</span>}
                  </td>
                  <td>
                    <button
                      onClick={() => u.id !== me?.id && toggleActive.mutate({ id: u.id, is_active: u.is_active ? 0 : 1 })}
                      disabled={u.id === me?.id}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                        u.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {u.is_active ? <><UserCheck size={12} /> Active</> : <><UserX size={12} /> Inactive</>}
                    </button>
                  </td>
                  <td className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(u)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${u.full_name}? This cannot be undone.`)) {
                              deleteUser.mutate(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => setEditing(null)}
        />
      )}
      {showInvite && <InviteLinkModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}