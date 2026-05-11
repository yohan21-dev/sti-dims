// src/pages/Deployments.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentApi, studentsApi } from '@/lib/api';
import {
  Briefcase, Clock, CheckCircle, XCircle,
  ChevronRight, Filter, Plus, X,
  Loader2, CalendarDays, User, TimerIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { Deployment, DeployStatus, Student } from '@/types';

const STATUSES: DeployStatus[] = ['pending', 'ongoing', 'completed', 'cancelled'];
const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  ongoing:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-600',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock size={12} />,
  ongoing:   <TimerIcon size={12} />,
  completed: <CheckCircle size={12} />,
  cancelled: <XCircle size={12} />,
};

// ── Log Hours Modal ───────────────────────────────────────────────────
function LogHoursModal({
  deployment,
  onClose,
  onSuccess,
}: {
  deployment: Deployment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [logDate,   setLogDate]   = useState(new Date().toISOString().split('T')[0]);
  const [timeIn,    setTimeIn]    = useState('08:00');
  const [timeOut,   setTimeOut]   = useState('12:00');
  const [verified,  setVerified]  = useState(false);
  const [remarks,   setRemarks]   = useState('');

  const mutation = useMutation({
    mutationFn: () => deploymentApi.logHours({
      deployment_id: deployment.id,
      log_date:      logDate,
      time_in:       timeIn,
      time_out:      timeOut,
      verified,
      remarks:       remarks || null,
    }),
    onSuccess: () => {
      toast.success('Service hours logged');
      onSuccess();
    },
    onError: () => toast.error('Failed to log hours'),
  });

  // Compute duration preview
  const hoursPreview = (() => {
    try {
      const [ih, im] = timeIn.split(':').map(Number);
      const [oh, om] = timeOut.split(':').map(Number);
      const diff = (oh * 60 + om) - (ih * 60 + im);
      if (diff <= 0) return null;
      return (diff / 60).toFixed(1);
    } catch { return null; }
  })();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-sm w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sti-blue-pale flex items-center justify-center">
              <TimerIcon size={18} className="text-sti-blue" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sti-blue text-base">Log Service Hours</h2>
              <p className="text-xs text-slate-500 mt-0.5">{deployment.department}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="input-label">Date</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Time In</label>
              <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} className="w-full" />
            </div>
            <div className="form-group">
              <label className="input-label">Time Out</label>
              <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} className="w-full" />
            </div>
          </div>
          {hoursPreview && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sti-blue-pale border border-sti-blue/20 text-sm text-sti-blue font-semibold">
              <Clock size={14} /> {hoursPreview} hours will be logged
            </div>
          )}
          <div className="form-group">
            <label className="input-label">Remarks (optional)</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              rows={2} placeholder="Notes from supervisor…" className="w-full resize-none" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}
              className="w-4 h-4 accent-sti-blue rounded" />
            <span className="text-sm text-slate-700 group-hover:text-sti-blue transition-colors">
              Mark as verified by supervisor
            </span>
          </label>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !hoursPreview}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
          >
            {mutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={15} /> Log Hours</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────
function HoursBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-sti-blue' : 'bg-amber-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{done} / {total} hrs</span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function DeploymentsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [logTarget, setLogTarget]       = useState<Deployment | null>(null);
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['deployments', 'list', filterStatus],
    queryFn: () =>
      deploymentApi.list(filterStatus ? { status: filterStatus } : {})
        .then(r => r.data.data as Deployment[]),
  });

  // Enrich with student names
  const studentIds = [...new Set((data ?? []).map(d => d.student_id).filter(Boolean) as number[])];
  const { data: studentsData } = useQuery({
    queryKey: ['students_batch', studentIds],
    queryFn: async () => {
      if (!studentIds.length) return {};
      const map: Record<number, Student> = {};
      await Promise.all(
        studentIds.map(id =>
          studentsApi.get(id)
            .then(r => { map[id] = r.data.data as Student; })
            .catch(() => {})
        )
      );
      return map;
    },
    enabled: studentIds.length > 0,
  });
  const studentMap = studentsData ?? {};

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DeployStatus }) =>
      deploymentApi.patch(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deployments = data ?? [];

  // Stats
  const stats = {
    pending:   deployments.filter(d => d.status === 'pending').length,
    ongoing:   deployments.filter(d => d.status === 'ongoing').length,
    completed: deployments.filter(d => d.status === 'completed').length,
    overdue:   deployments.filter(d => {
      if (d.status === 'completed' || d.status === 'cancelled') return false;
      return d.date_assigned && differenceInDays(new Date(), parseISO(d.date_assigned)) > 60;
    }).length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="section-title">Deployments</h1>
        <p className="section-sub">Track community service assignments and service hour logs</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending',   value: stats.pending,   icon: <Clock size={16} />,         color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Ongoing',   value: stats.ongoing,   icon: <TimerIcon size={16} />,      color: 'bg-blue-50 border-blue-200 text-sti-blue' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle size={16} />,    color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Overdue',   value: stats.overdue,   icon: <CalendarDays size={16} />,   color: 'bg-red-50 border-red-200 text-red-600' },
        ].map(s => (
          <div key={s.label} className={`card border flex items-center gap-3 py-3 ${s.color}`}>
            <div className={`p-2 rounded-xl bg-white/60`}>{s.icon}</div>
            <div>
              <p className="font-display font-bold text-2xl leading-none">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5 opacity-70">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={15} className="text-slate-400" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filterStatus === '' ? 'bg-sti-blue text-white shadow-btn' : 'bg-white border border-slate-200 text-slate-600 hover:border-sti-blue/30'
            }`}
          >
            All
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                filterStatus === s ? 'bg-sti-blue text-white shadow-btn' : 'bg-white border border-slate-200 text-slate-600 hover:border-sti-blue/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table / cards */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 size={24} className="mx-auto mb-3 text-sti-blue animate-spin" />
            <p className="text-slate-400 text-sm">Loading deployments…</p>
          </div>
        ) : deployments.length === 0 ? (
          <div className="p-10 text-center">
            <Briefcase size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">No deployments found</p>
            <p className="text-slate-400 text-xs mt-1">Deployments are created when recording a violation with community service.</p>
          </div>
        ) : (
          <div>
            {/* Desktop table */}
            <table className="table-base hidden md:table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Violation</th>
                  <th>Department</th>
                  <th>Hours</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map(d => {
                  const student = d.student_id ? studentMap[d.student_id] : null;
                  const overdue = d.status !== 'completed' && d.status !== 'cancelled' &&
                    d.date_assigned && differenceInDays(new Date(), parseISO(d.date_assigned)) > 60;

                  return (
                    <tr key={d.id} className={overdue ? 'bg-red-50/40' : ''}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sti-blue-pale border border-sti-blue/20 flex items-center justify-center text-sti-blue font-bold text-xs shrink-0">
                            {student ? student.last_name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {student ? `${student.last_name}, ${student.first_name}` : `ID: ${d.student_id}`}
                            </p>
                            <p className="text-xs text-slate-400">{student?.student_number}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm text-slate-700 max-w-[140px] truncate">{d.violation_name}</p>
                      </td>
                      <td>
                        <p className="text-sm font-medium text-slate-700">{d.department}</p>
                        {d.supervisor_name && (
                          <p className="text-xs text-slate-400">Supervisor: {d.supervisor_name}</p>
                        )}
                      </td>
                      <td>
                        <div className="min-w-[100px]">
                          <HoursBar done={Number(d.hours_completed)} total={Number(d.hours_required)} />
                        </div>
                      </td>
                      <td>
                        <p className="text-sm text-slate-600">
                          {d.date_assigned ? format(parseISO(d.date_assigned), 'MMM d, yyyy') : '—'}
                        </p>
                        {overdue && (
                          <p className="text-xs text-red-500 font-semibold">Overdue!</p>
                        )}
                      </td>
                      <td>
                        <span className={`badge flex items-center gap-1 w-fit ${STATUS_BADGE[d.status] ?? ''}`}>
                          {STATUS_ICON[d.status]}{d.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {d.status === 'ongoing' && (
                            <button
                              onClick={() => setLogTarget(d)}
                              className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                            >
                              <Plus size={12} /> Log Hours
                            </button>
                          )}
                          <select
                            value={d.status}
                            onChange={e => patchMutation.mutate({ id: d.id, status: e.target.value as DeployStatus })}
                            className="text-xs py-1 px-2 max-w-[110px]"
                          >
                            {STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {deployments.map(d => {
                const student    = d.student_id ? studentMap[d.student_id] : null;
                const isExpanded = expandedId === d.id;
                const overdue    = d.status !== 'completed' && d.status !== 'cancelled' &&
                  d.date_assigned && differenceInDays(new Date(), parseISO(d.date_assigned)) > 60;

                return (
                  <div key={d.id} className={`p-4 ${overdue ? 'bg-red-50/40' : ''}`}>
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-sti-blue flex items-center justify-center text-white font-bold shrink-0">
                        {student ? student.last_name.charAt(0) : <User size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {student ? `${student.last_name}, ${student.first_name}` : `ID: ${d.student_id}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{d.department}</p>
                          </div>
                          <span className={`badge flex items-center gap-1 shrink-0 ${STATUS_BADGE[d.status] ?? ''}`}>
                            {STATUS_ICON[d.status]}{d.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <HoursBar done={Number(d.hours_completed)} total={Number(d.hours_required)} />
                        </div>
                      </div>
                      <ChevronRight size={16} className={`text-slate-400 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-slate-400 font-semibold uppercase tracking-wide">Violation</p>
                            <p className="text-slate-700">{d.violation_name ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold uppercase tracking-wide">Assigned</p>
                            <p className="text-slate-700">{d.date_assigned ? format(parseISO(d.date_assigned), 'MMM d, yyyy') : '—'}</p>
                          </div>
                          {d.supervisor_name && (
                            <div className="col-span-2">
                              <p className="text-slate-400 font-semibold uppercase tracking-wide">Supervisor</p>
                              <p className="text-slate-700">{d.supervisor_name}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {d.status === 'ongoing' && (
                            <button onClick={() => setLogTarget(d)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                              <Plus size={12} /> Log Hours
                            </button>
                          )}
                          <select
                            value={d.status}
                            onChange={e => patchMutation.mutate({ id: d.id, status: e.target.value as DeployStatus })}
                            className="text-xs py-1.5 px-2 flex-1"
                          >
                            {STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Log Hours Modal */}
      {logTarget && (
        <LogHoursModal
          deployment={logTarget}
          onClose={() => setLogTarget(null)}
          onSuccess={() => {
            setLogTarget(null);
            qc.invalidateQueries({ queryKey: ['deployments'] });
          }}
        />
      )}
    </div>
  );
}