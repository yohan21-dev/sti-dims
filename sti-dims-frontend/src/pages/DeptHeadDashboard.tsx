import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '@/lib/api';
import {
  Clock, CheckCircle, TimerIcon,
  User, ChevronDown, ChevronUp, Plus,
  Loader2, CalendarDays, AlertTriangle, ClipboardCheck,
  Play, Pause, RotateCcw, AlarmClock, PenLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { Deployment, DeployStatus } from '@/types';

// TODO: Make this timer persistent when on session and when refreshed
// TODO: Make this timer appear to the officers violations tab

// ─── Timer state (lifted so it survives card collapse) ────────────────
interface TimerState {
  /** wall-clock ms when the current run started (null = paused) */
  startedAt: number | null;
  /** total ms accumulated from previous runs */
  accumulated: number;
  /** whether the session has been started at all */
  active: boolean;
}

const TIMER_INIT: TimerState = { startedAt: null, accumulated: 0, active: false };

// ─── Utility ─────────────────────────────────────────────────────────
function msToHMS(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, totalSec };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function elapsedMs(ts: TimerState, now: number) {
  return ts.accumulated + (ts.startedAt !== null ? now - ts.startedAt : 0);
}

// ─── Hours progress bar ───────────────────────────────────────────────
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

// ─── Live clock display ───────────────────────────────────────────────
function TimerDisplay({ ms, required }: { ms: number; required: number }) {
  const { h, m, s } = msToHMS(ms);
  const requiredMs = required * 3600_000;
  const remainMs  = Math.max(0, requiredMs - ms);
  const { h: rh, m: rm, s: rs } = msToHMS(remainMs);
  const done = ms >= requiredMs && required > 0;

  return (
    <div className={`rounded-2xl p-4 text-center space-y-1 ${done ? 'bg-green-50 border border-green-200' : 'bg-sti-blue/5 border border-sti-blue/15'}`}>
      {/* Elapsed */}
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Time Remaining</p>
      <p className={`font-mono font-bold text-4xl leading-none tabular-nums tracking-tight ${done ? 'text-green-600' : 'text-sti-blue'}`}>
        {pad(rh)}:{pad(rm)}:{pad(rs)}
      </p>
      {required > 0 && (
        <p className={`text-xs font-semibold mt-1 ${done ? 'text-green-600' : 'text-slate-500'}`}>
          {done
            ? '✓ Hours requirement met!'
            : pad(h)}:{pad(m)}:{pad(s)}
        </p>
      )}
    </div>
  );
}

// ─── Log Hours Panel (manual + timer tabs) ───────────────────────────
function LogHoursPanel({
  deployment,
  timer,
  onTimerChange,
  onClose,
  onSuccess,
}: {
  deployment: Deployment;
  timer: TimerState;
  onTimerChange: (ts: TimerState) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');

  // Manual fields
  const [logDate,  setLogDate]  = useState(new Date().toISOString().split('T')[0]);
  const [timeIn,   setTimeIn]   = useState('08:00');
  const [timeOut,  setTimeOut]  = useState('12:00');
  const [remarks,  setRemarks]  = useState('');

  // Live tick
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTick = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  useEffect(() => {
    if (timer.startedAt !== null) startTick();
    return stopTick;
  }, [timer.startedAt, startTick, stopTick]);

  // Timer actions
  const handleStart = () => {
    onTimerChange({ ...timer, startedAt: Date.now(), active: true });
    startTick();
  };

  const handlePause = () => {
    const acc = elapsedMs(timer, Date.now());
    onTimerChange({ startedAt: null, accumulated: acc, active: true });
    stopTick();
  };

  const handleReset = () => {
    stopTick();
    onTimerChange(TIMER_INIT);
  };

  const elapsed = elapsedMs(timer, now);
  const isRunning = timer.startedAt !== null;
  const isPaused  = timer.active && !isRunning;

  // Derive time strings from elapsed for submission
  const timerStartWall = timer.active
    ? new Date(Date.now() - elapsed).toTimeString().slice(0, 5)
    : '08:00';
  const timerNowStr   = new Date().toTimeString().slice(0, 5);

  const manualHoursPreview = (() => {
    try {
      const [ih, im] = timeIn.split(':').map(Number);
      const [oh, om] = timeOut.split(':').map(Number);
      const diff = (oh * 60 + om) - (ih * 60 + im);
      return diff > 0 ? (diff / 60).toFixed(2) : null;
    } catch { return null; }
  })();

  const timerHoursPreview = elapsed > 0
    ? (elapsed / 3_600_000).toFixed(2)
    : null;

  const mutation = useMutation({
    mutationFn: (payload: {
      deployment_id: number; log_date: string;
      time_in: string; time_out: string;
      verified: boolean; remarks: string | null;
    }) => deploymentsApi.logHours(payload),
    onSuccess: () => {
      toast.success('Hours logged and verified');
      handleReset();
      onSuccess();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to log hours';
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    if (mode === 'timer') {
      if (!timerHoursPreview) { toast.error('No time recorded yet'); return; }
      mutation.mutate({
        deployment_id: deployment.id,
        log_date:      new Date().toISOString().split('T')[0],
        time_in:       timerStartWall,
        time_out:      timerNowStr,
        verified:      true,
        remarks:       remarks || null,
      });
    } else {
      if (!manualHoursPreview) { toast.error('Time out must be after time in'); return; }
      mutation.mutate({
        deployment_id: deployment.id,
        log_date:      logDate,
        time_in:       timeIn,
        time_out:      timeOut,
        verified:      true,
        remarks:       remarks || null,
      });
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-blue-100 bg-blue-50/30 rounded-xl p-3 space-y-3 animate-fade-in">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('timer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mode === 'timer'
              ? 'bg-sti-blue text-white shadow-btn'
              : 'text-slate-500 hover:text-sti-blue'
          }`}
        >
          <AlarmClock size={12} /> Live Timer
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            mode === 'manual'
              ? 'bg-sti-blue text-white shadow-btn'
              : 'text-slate-500 hover:text-sti-blue'
          }`}
        >
          <PenLine size={12} /> Manual Entry
        </button>
      </div>

      {/* ── Timer mode ── */}
      {mode === 'timer' && (
        <div className="space-y-3">
          <TimerDisplay ms={elapsed} required={Number(deployment.hours_required)} />

          {/* Control row */}
          <div className="flex items-center gap-2 justify-center">
            {!timer.active ? (
              <button
                type="button"
                onClick={handleStart}
                className="btn-primary flex items-center gap-2 px-5 py-2 text-sm"
              >
                <Play size={14} /> Start Timer
              </button>
            ) : isRunning ? (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
                >
                  <Pause size={14} /> Pause
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Reset timer"
                >
                  <RotateCcw size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors"
                >
                  <Play size={14} /> Resume
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Reset timer"
                >
                  <RotateCcw size={15} />
                </button>
              </>
            )}
          </div>

          {/* Paused hint */}
          {isPaused && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              <Pause size={11} className="shrink-0" />
              Timer paused — resume when the student returns, or log what's recorded so far.
            </div>
          )}

          {timerHoursPreview && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sti-blue-pale text-sti-blue text-xs font-semibold">
              <Clock size={12} /> {timerHoursPreview} hrs will be logged
            </div>
          )}
        </div>
      )}

      {/* ── Manual mode ── */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <div className="form-group">
            <label className="input-label text-xs">Date</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} className="w-full text-xs py-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="form-group">
              <label className="input-label text-xs">Time In</label>
              <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} className="w-full text-xs py-1.5" />
            </div>
            <div className="form-group">
              <label className="input-label text-xs">Time Out</label>
              <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} className="w-full text-xs py-1.5" />
            </div>
          </div>
          {manualHoursPreview && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sti-blue-pale text-sti-blue text-xs font-semibold">
              <Clock size={12} /> {manualHoursPreview} hrs will be logged
            </div>
          )}
        </div>
      )}

      {/* Remarks (shared) */}
      <div className="form-group">
        <label className="input-label text-xs">Remarks (optional)</label>
        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
          placeholder="e.g. Completed shelving task" className="w-full text-xs py-1.5" />
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">
          Close
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            mutation.isPending ||
            (mode === 'timer' ? !timerHoursPreview : !manualHoursPreview)
          }
          className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 flex-1 justify-center"
        >
          {mutation.isPending
            ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
            : <><CheckCircle size={12} /> Log & Verify Hours</>}
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
        <ClipboardCheck size={11} /> Hours are auto-verified as department head
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function DeptHeadDashboard() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const [loggingId,    setLoggingId]    = useState<number | null>(null);

  // Timer states keyed by deployment id — survives card collapse
  const [timerMap, setTimerMap] = useState<Record<number, TimerState>>({});

  const getTimer = (id: number): TimerState => timerMap[id] ?? TIMER_INIT;
  const setTimer = (id: number, ts: TimerState) =>
    setTimerMap(prev => ({ ...prev, [id]: ts }));

  const { data, isLoading } = useQuery({
    queryKey: ['dept-head-deployments', filterStatus],
    queryFn: () =>
      deploymentsApi.list(filterStatus ? { status: filterStatus } : {})
        .then(r => r.data as {
          data: Deployment[];
          department: { id: number; name: string; code: string; location?: string };
        }),
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
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to update';
      toast.error(msg);
    },
  });

  const STATUSES: DeployStatus[] = ['pending', 'ongoing', 'completed'];

  const stats = {
    pending:   deployments.filter(d => d.status === 'pending').length,
    ongoing:   deployments.filter(d => d.status === 'ongoing').length,
    completed: deployments.filter(d => d.status === 'completed').length,
  };

  // Running timers count for the header badge
  const runningCount = Object.values(timerMap).filter(t => t.startedAt !== null).length;

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
        <div className="flex items-center gap-2 shrink-0">
          {runningCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {runningCount} timer{runningCount > 1 ? 's' : ''} running
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Your service queue
          </div>
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
          const timer      = getTimer(d.id);
          const overdue    = d.status !== 'completed' && d.status !== 'cancelled' &&
            d.date_assigned && differenceInDays(new Date(), parseISO(d.date_assigned)) > 60;
          const timerRunning = timer.startedAt !== null;

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
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Timer running indicator on collapsed card */}
                      {timerRunning && (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full animate-pulse">
                          <Play size={9} fill="currentColor" /> Timing
                        </span>
                      )}
                      <span className={`badge flex items-center gap-1 ${STATUS_BADGE[d.status] ?? ''}`}>
                        {STATUS_ICON[d.status]}{d.status}
                      </span>
                    </div>
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
                    {d.status === 'ongoing' && !isLogging && (
                      <>
                        <button
                          onClick={() => setLoggingId(d.id)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Plus size={13} />
                          {timer.active ? 'View Timer' : 'Log Hours'}
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

                  {/* Log hours panel */}
                  {isLogging && d.status === 'ongoing' && (
                    <LogHoursPanel
                      deployment={d}
                      timer={timer}
                      onTimerChange={ts => setTimer(d.id, ts)}
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