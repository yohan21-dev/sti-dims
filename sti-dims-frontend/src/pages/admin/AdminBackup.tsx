import { useState } from 'react';
import {
  Download, Database, Users, AlertTriangle,
  Briefcase, FileJson, FileText, Loader2, CheckCircle, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Scope = 'all' | 'violations' | 'deployments' | 'students' | 'users';
type Format = 'json' | 'csv';

interface BackupOption {
  scope: Scope;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const OPTIONS: BackupOption[] = [
  {
    scope: 'all',
    label: 'Full Backup',
    description: 'All tables: students, violations, deployments, users, and violation types',
    icon: <Database size={20} />,
    color: 'border-sti-blue/30 bg-sti-blue-pale text-sti-blue',
  },
  {
    scope: 'violations',
    label: 'Violations',
    description: 'All violation records with student names, severities, and officer notes',
    icon: <AlertTriangle size={20} />,
    color: 'border-orange-200 bg-orange-50 text-orange-600',
  },
  {
    scope: 'deployments',
    label: 'Deployments',
    description: 'Community service assignments and service hour logs',
    icon: <Briefcase size={20} />,
    color: 'border-purple-200 bg-purple-50 text-purple-600',
  },
  {
    scope: 'students',
    label: 'Students',
    description: 'Student roster from STI Cubao with violation summary counts',
    icon: <Users size={20} />,
    color: 'border-green-200 bg-green-50 text-green-600',
  },
  {
    scope: 'users',
    label: 'System Users',
    description: 'Discipline officer accounts (no passwords included)',
    icon: <Users size={20} />,
    color: 'border-slate-200 bg-slate-50 text-slate-600',
  },
];

export default function AdminBackup() {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{ scope: string; format: string; time: Date } | null>(null);

  const handleExport = async (scope: Scope, format: Format) => {
    const key = `${scope}-${format}`;
    setLoading(key);

    try {
      // Use fetch directly so we can handle binary/text responses
      const token = document.cookie
        .split('; ')
        .find(r => r.startsWith('csrf_token='))
        ?.split('=')[1] ?? '';

      const res = await fetch(`/api/admin/backup/index.php?scope=${scope}&format=${format}`, {
        credentials: 'include',
        headers: { 'X-CSRF-Token': token },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error ?? 'Export failed');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `sti_dims_${scope}_${Date.now()}.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport({ scope, format, time: new Date() });
      toast.success(`${scope === 'all' ? 'Full backup' : scope} exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Export failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-slate-800">Data Backup & Export</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Export system data as JSON (full fidelity) or CSV (spreadsheet-compatible)
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">About backups</p>
          <p className="text-xs mt-0.5 text-blue-600">
            JSON exports preserve all data relationships and types. CSV exports are best for single tables and spreadsheet analysis.
            Passwords and sensitive tokens are never included. All exports are logged to the audit trail.
          </p>
        </div>
      </div>

      {/* Last export badge */}
      {lastExport && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 w-fit animate-fade-in">
          <CheckCircle size={15} />
          Last exported: <strong>{lastExport.scope}</strong> as {lastExport.format.toUpperCase()} at{' '}
          {lastExport.time.toLocaleTimeString()}
        </div>
      )}

      {/* Backup options */}
      <div className="space-y-3">
        {OPTIONS.map(opt => {
          const isLoadingJson = loading === `${opt.scope}-json`;
          const isLoadingCsv  = loading === `${opt.scope}-csv`;

          return (
            <div
              key={opt.scope}
              className="card flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${opt.color}`}>
                  {opt.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExport(opt.scope, 'json')}
                  disabled={!!loading}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-sti-blue/30 bg-sti-blue-pale text-sti-blue hover:bg-sti-blue hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingJson
                    ? <Loader2 size={14} className="animate-spin" />
                    : <FileJson size={14} />}
                  JSON
                </button>
                <button
                  onClick={() => handleExport(opt.scope, 'csv')}
                  disabled={!!loading || opt.scope === 'all'}
                  title={opt.scope === 'all' ? 'Use JSON for full backup; CSV exports one table at a time' : ''}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoadingCsv
                    ? <Loader2 size={14} className="animate-spin" />
                    : <FileText size={14} />}
                  CSV
                  {opt.scope === 'all' && <span className="text-xs text-slate-300 ml-0.5">(JSON only)</span>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick export all */}
      <div className="card border-2 border-dashed border-sti-blue/30 bg-sti-blue-pale/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-display font-bold text-sti-blue">Quick Full Export</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Download everything in a single JSON file — the safest option for a complete backup.
            </p>
          </div>
          <button
            onClick={() => handleExport('all', 'json')}
            disabled={!!loading}
            className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 shrink-0"
          >
            {loading === 'all-json'
              ? <><Loader2 size={16} className="animate-spin" /> Exporting…</>
              : <><Download size={16} /> Export Full Backup</>}
          </button>
        </div>
      </div>
    </div>
  );
}