import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '@/lib/api';
import {
  Clock, CheckCircle, TimerIcon,
  User, ChevronDown, ChevronUp, Plus,
  Loader2, CalendarDays, AlertTriangle, ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { Deployment, DeployStatus } from '@/types';

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
};

// ── Hours progress bar ────────────────────────────────────────────────
function HoursBar({ done, total }: { done: number; total: number }) {
  const pct   = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-sti-blue' : 'bg-amber-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{done} / {total} hrs</span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Log Hours inline panel ────────────────────────────────────────────
function LogHoursPanel({
  deployment,
  onClose,
  onSuccess,
}: {
  deployment: Deployment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [logDate,  setLogDate]  = useState(new Date().toISOString().split('T')[0]);
  const [timeIn,   setTimeIn]   = useState('08:00');
  const [timeOut,  setTimeOut]  = useState('12:00');
  const [remarks,  setRemarks]  = useState('');

  const hoursPreview = (() => {
    try {
      const [ih, im] = timeIn.split(':').map(Number);
      const [oh, om] = timeOut.split(':').map(Number);
      const diff = (oh * 60 + om) - (ih * 60 + im);
      return diff > 0 ? (diff / 60).toFixed(1) : null;
    } catch { return null; }
  })();

  const mutation = useMutation({
    mutationFn: () => deploymentsApi.logHours({
      deployment_id: deployment.id,
      log_date:      logDate,
      time_in:       timeIn,
      time_out:      timeOut,
      verified:      true,  // dept_head always verifies
      remarks:       remarks || null,
    }),
    onSuccess: () => {
      toast.success('Hours logged and verified');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to log hours'),
  });

  return (
    <div className="mt-3 pt-3 border-t border-blue-100 bg-blue-50/40 rounded-xl p-3 space-y-3 animate-fade-in">
      <p className="text-xs font-bold text-sti-blue uppercase tracking-wide flex items-center gap-1.5">
        <ClipboardCheck size={13} /> Log Service Hours
        <span className="ml-auto text-slate-400 font-normal normal-case">Hours are auto-verified</span>
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div className="form-group">
          <label className="input-label text-xs">Date</label>
          <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} className="w-full text-xs py-1.5" />
        </div>
        <div className="form-group">
          <label className="input-label text-xs">Time In</label>
          <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} className="w-full text-xs py-1.5" />
        </div>
        <div className="form-group">
          <label className="input-label text-xs">Time Out</label>
          <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} className="w-full text-xs py-1.5" />
        </div>
      </div>

      {hoursPreview && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sti-blue-pale text-sti-blue text-xs font-semibold">
          <Clock size={12} /> {hoursPreview} hrs will be logged and verified
        </div>
      )}

      <div className="form-group">
        <label className="input-label text-xs">Remarks (optional)</label>
        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
          placeholder="e.g. Completed shelving task" className="w-full text-xs py-1.5" />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !hoursPreview}
          className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
        >
          {mutation.isPending
            ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
            : <><CheckCircle size={12} /> Confirm Hours</>}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function DeptHeadDashboard() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [loggingId, setLoggingId]       = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dept-head-deployments', filterStatus],
    queryFn: () =>
      deploymentsApi.list(filterStatus ? { status: filterStatus } : {})
        .then(r => r.data as { data: Deployment[]; department: { id: number; name: string; code: string; location?: string } }),
  });

  const deployments = data?.data ?? [];
  const department  = data?.department;

  const ackMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DeployStatus }) =>
      deploymentsApi.patch(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['dept-head-deployments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to update'),
  });

  const STATUSES: DeployStatus[] = ['pending', 'ongoing', 'completed'];

  const stats = {
    pending:   deployments.filter(d => d.status === 'pending').length,
    ongoing:   deployments.filter(d => d.status === 'ongoing').length,
    completed: deployments.filter(d => d.status === 'completed').length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="section-title">Community Service Queue</h1>
          {department ? (
            <p className="section-sub">
              <span className="font-semibold text-sti-blue">{department.name}</span>
              {department.location && <> · {department.location}</>}
            </p>
          ) : (
            <p className="section-sub text-amber-600">No department assigned to your account yet.</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Your service queue
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Awaiting',  value: stats.pending,   icon: <Clock size={16} />,         color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Ongoing',   value: stats.ongoing,   icon: <TimerIcon size={16} />,      color: 'bg-blue-50 border-blue-200 text-sti-blue' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle size={16} />,    color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`card border flex items-center gap-3 py-3 ${s.color}`}>
            <div className="p-2 rounded-xl bg-white/60">{s.icon}</div>
            <div>
              <p className="font-display font-bold text-2xl leading-none">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5 opacity-70">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter */}
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
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              filterStatus === s ? 'bg-sti-blue text-white shadow-btn' : 'bg-white border border-slate-200 text-slate-600 hover:border-sti-blue/30'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cards list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="card p-10 text-center">
            <Loader2 size={24} className="mx-auto mb-3 text-sti-blue animate-spin" />
            <p className="text-slate-400 text-sm">Loading your queue…</p>
          </div>
        ) : deployments.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">
              {filterStatus ? `No ${filterStatus} deployments` : 'No students assigned to your department yet'}
            </p>
          </div>
        ) : deployments.map(d => {
          const isExpanded = expandedId === d.id;
          const isLogging  = loggingId  === d.id;
          const overdue    = d.status !== 'completed' && d.status !== 'cancelled' &&
            d.date_assigned && differenceInDays(new Date(), parseISO(d.date_assigned)) > 60;

          return (
            <div key={d.id} className={`card transition-all ${overdue ? 'border-red-200 bg-red-50/20' : ''}`}>
              {/* Main row */}
              <div
                className="flex items-start gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-sti-blue flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {d.student_name ? d.student_name.charAt(0) : <User size={18} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-display font-bold text-slate-800">{d.student_name ?? `ID: ${d.student_id}`}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {d.student_number && <span className="font-mono text-xs text-slate-400">{d.student_number}</span>}
                        {d.student_program && <span className="text-xs text-slate-400">· {d.student_program}</span>}
                      </div>
                    </div>
                    <span className={`badge flex items-center gap-1 shrink-0 ${STATUS_BADGE[d.status] ?? ''}`}>
                      {STATUS_ICON[d.status]}{d.status}
                    </span>
                  </div>

                  {/* Violation info */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <AlertTriangle size={11} className="text-amber-500" />
                    <span>{d.violation_name ?? '—'}</span>
                    {d.date_assigned && (
                      <>
                        <span className="text-slate-300">·</span>
                        <CalendarDays size={11} />
                        <span>Assigned {format(parseISO(d.date_assigned), 'MMM d, yyyy')}</span>
                      </>
                    )}
                    {overdue && <span className="text-red-500 font-semibold ml-1">Overdue!</span>}
                  </div>

                  {/* Hours bar */}
                  <div className="mt-3">
                    <HoursBar done={Number(d.hours_completed)} total={Number(d.hours_required)} />
                  </div>
                </div>

                {/* Expand toggle */}
                <div className="text-slate-400 shrink-0 mt-1">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in space-y-3">
                  {/* Status actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.status === 'pending' && (
                      <button
                        onClick={() => ackMutation.mutate({ id: d.id, status: 'ongoing' })}
                        disabled={ackMutation.isPending}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <CheckCircle size={13} /> Accept Student
                      </button>
                    )}
                    {d.status === 'ongoing' && (
                      <>
                        <button
                          onClick={() => { setLoggingId(isLogging ? null : d.id); }}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Plus size={13} /> Log Hours
                        </button>
                        <button
                          onClick={() => ackMutation.mutate({ id: d.id, status: 'completed' })}
                          disabled={ackMutation.isPending}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-green-600 hover:bg-green-50 border-green-200"
                        >
                          <CheckCircle size={13} /> Mark Complete
                        </button>
                      </>
                    )}
                    {d.status === 'completed' && (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
                        <CheckCircle size={13} /> Service completed
                        {d.date_completed && ` on ${format(parseISO(d.date_completed), 'MMM d, yyyy')}`}
                      </div>
                    )}
                  </div>

                  {/* Log hours form */}
                  {isLogging && d.status === 'ongoing' && (
                    <LogHoursPanel
                      deployment={d}
                      onClose={() => setLoggingId(null)}
                      onSuccess={() => {
                        setLoggingId(null);
                        qc.invalidateQueries({ queryKey: ['dept-head-deployments'] });
                      }}
                    />
                  )}

                  {/* Supervisor note */}
                  {d.supervisor_name && (
                    <p className="text-xs text-slate-500">
                      Supervisor: <span className="font-medium">{d.supervisor_name}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}