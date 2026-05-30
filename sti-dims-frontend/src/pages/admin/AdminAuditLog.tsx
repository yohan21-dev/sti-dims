import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ScrollText, Search, RefreshCw, Loader2, Shield, AlertTriangle, User, FileText, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AuditEntry {
  id:           number;
  user_id:      number | null;
  username:     string | null;
  full_name:    string | null;
  action:       string;
  entity:       string | null;
  entity_id:    number | null;
  ip_address:   string | null;
  created_at:   string;
  payload?:     string;
}

const ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  'auth.login':         { color: 'bg-green-100 text-green-700',   icon: <User size={11} /> },
  'auth.logout':        { color: 'bg-slate-100 text-slate-600',   icon: <User size={11} /> },
  'violation.create':   { color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle size={11} /> },
  'violation.update':   { color: 'bg-amber-100 text-amber-700',   icon: <AlertTriangle size={11} /> },
  'violation.delete':   { color: 'bg-red-100 text-red-700',       icon: <AlertTriangle size={11} /> },
  'file.upload':        { color: 'bg-blue-100 text-blue-700',     icon: <Upload size={11} /> },
  'deployment.create':  { color: 'bg-purple-100 text-purple-700', icon: <FileText size={11} /> },
  'deployment.update':  { color: 'bg-purple-50 text-purple-600',  icon: <FileText size={11} /> },
};

const getActionConfig = (action: string) =>
  ACTION_CONFIG[action] ?? { color: 'bg-slate-100 text-slate-600', icon: <Shield size={11} /> };

export default function AdminAuditLog() {
  const [q, setQ]           = useState('');
  const [page, setPage]     = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-log', q, action, page],
    queryFn: () =>
      api.get('/admin/audit/index.php', {
        params: {
          ...(q ? { q } : {}),
          ...(action ? { action } : {}),
          page,
          limit: 50,
        },
      }).then(r => r.data as { data: AuditEntry[]; meta: { total: number; pages: number; page: number } }),
    refetchInterval: 30_000,
  });

  const entries = data?.data ?? [];
  const meta    = data?.meta;

  const uniqueActions = [
    'auth.login', 'auth.logout',
    'violation.create', 'violation.update', 'violation.delete',
    'file.upload', 'deployment.create', 'deployment.update',
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-slate-800">Audit Log</h2>
          <p className="text-sm text-slate-500">
            {meta?.total.toLocaleString() ?? '…'} events recorded
            <span className="ml-2 text-xs text-slate-400">· auto-refreshes every 30s</span>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary flex items-center gap-1.5 text-sm self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by user or action…"
            className="w-full pl-9 text-sm"
          />
        </div>
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          className="text-sm"
        >
          <option value="">All Actions</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 className="mx-auto mb-3 text-sti-blue animate-spin" size={24} />
            <p className="text-slate-400 text-sm">Loading audit log…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <ScrollText size={28} className="mx-auto mb-2 text-slate-200" />
            <p className="text-slate-400 text-sm">No audit entries found</p>
          </div>
        ) : (
          <>
            <table className="table-base">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th className="hidden md:table-cell">Entity</th>
                  <th className="hidden lg:table-cell">IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const cfg = getActionConfig(e.action);
                  return (
                    <tr key={e.id}>
                      <td>
                        {e.full_name ? (
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{e.full_name}</p>
                            <p className="text-xs text-slate-400">@{e.username}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm italic">System</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge flex items-center gap-1 w-fit ${cfg.color}`}>
                          {cfg.icon}
                          {e.action}
                        </span>
                      </td>
                      <td className="hidden md:table-cell text-sm text-slate-500">
                        {e.entity
                          ? <span>{e.entity}{e.entity_id ? <span className="text-slate-300"> #{e.entity_id}</span> : ''}</span>
                          : '—'}
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="font-mono text-xs text-slate-400">{e.ip_address ?? '—'}</span>
                      </td>
                      <td className="text-sm text-slate-500 whitespace-nowrap">
                        {format(parseISO(e.created_at), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  {meta.total.toLocaleString()} events · Page {meta.page} of {meta.pages}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={meta.page <= 1} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">← Prev</button>
                  <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={meta.page >= meta.pages} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}