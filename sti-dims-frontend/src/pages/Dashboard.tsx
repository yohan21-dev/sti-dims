// src/pages/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { AlertTriangle, Briefcase, TrendingUp, Users, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { Severity } from '@/types';

const SEVERITY_COLORS: Record<Severity, string> = {
  minor:    '#3B82F6',
  moderate: '#F59E0B',
  major:    '#F97316',
  critical: '#EF4444',
};

// Extended dashboard stats type that includes student_name
interface DashboardStats {
  violations_this_month: number;
  pending_deployments:   number;
  by_status:             Array<{ status: string; count: number }>;
  by_severity:           Array<{ severity: Severity; count: number }>;
  trend_30d:             Array<{ day: string; count: number }>;
  top_types:             Array<{ violation_name: string; count: number }>;
  repeat_offenders:      Array<{
    student_id:     number;
    student_name:   string;
    student_number: string;
    total:          number;
  }>;
  recent_violations: Array<{
    id:             number;
    student_id:     number;
    student_name:   string;
    violation_name: string;
    severity:       Severity;
    date_recorded:  string;
    status:         string;
  }>;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then(r => r.data.data as DashboardStats),
    refetchInterval: 60_000,
  });

  const statusCounts = Object.fromEntries(
    (data?.by_status ?? []).map(s => [s.status, s.count])
  );
  const trendData = (data?.trend_30d ?? []).map(d => ({
    day:   format(parseISO(d.day), 'MMM d'),
    count: Number(d.count),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-sub">Discipline activity overview — STI College Cubao</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live · refreshes every minute
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <AlertTriangle size={18} />, label: 'This Month', sub: 'violations',
            value:  isLoading ? '—' : String(data?.violations_this_month ?? 0),
            accent: 'text-amber-600', bg: 'bg-amber-50 border-amber-200',
          },
          {
            icon: <Briefcase size={18} />, label: 'Pending Deploy', sub: 'assignments',
            value:  isLoading ? '—' : String(data?.pending_deployments ?? 0),
            accent: 'text-sti-blue', bg: 'bg-sti-blue-pale border-blue-200',
          },
          {
            icon: <Clock size={18} />, label: 'Pending', sub: 'violations',
            value:  isLoading ? '—' : String(statusCounts['pending'] ?? 0),
            accent: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200',
          },
          {
            icon: <CheckCircle size={18} />, label: 'Resolved', sub: 'violations',
            value:  isLoading ? '—' : String(statusCounts['resolved'] ?? 0),
            accent: 'text-green-600', bg: 'bg-green-50 border-green-200',
          },
        ].map(card => (
          <div key={card.label} className={`card border ${card.bg} animate-slide-up`}>
            <div className={`inline-flex p-2 rounded-xl ${card.bg} ${card.accent} mb-3`}>
              {card.icon}
            </div>
            <p className="font-display text-3xl font-bold text-sti-blue">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-bold">{card.label}</p>
            <p className="text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 30-day trend */}
        <div className="lg:col-span-2 card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Violations — Last 30 Days
          </h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Loading…</div>
          ) : trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0D47A1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0D47A1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFF2F7" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #DDE4EF', borderRadius: '10px', color: '#0D47A1', fontSize: 13 }}
                  labelStyle={{ color: '#0D47A1', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="count" stroke="#0D47A1" strokeWidth={2.5} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By severity */}
        <div className="card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center gap-2">
            <AlertTriangle size={16} /> By Severity
          </h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.by_severity ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFF2F7" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="severity" tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} axisLine={false} width={65} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #DDE4EF', borderRadius: '10px', fontSize: 13 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {(data?.by_severity ?? []).map(entry => (
                    <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity as Severity] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top violation types */}
        <div className="card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Top Violation Types
          </h2>
          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : (data?.top_types ?? []).length === 0 ? (
            <p className="text-slate-400 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data!.top_types.map((t, i) => (
                <div key={t.violation_name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-sti-blue text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{t.violation_name}</span>
                      <span className="text-sm font-bold text-sti-blue">{t.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sti-blue rounded-full transition-all"
                        style={{ width: `${(t.count / (data!.top_types[0]?.count ?? 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Repeat offenders — showing real student names */}
        <div className="card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center gap-2">
            <Users size={16} /> Repeat Offenders
            <span className="ml-auto text-xs text-slate-400 font-normal">3+ violations</span>
          </h2>
          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : (data?.repeat_offenders ?? []).length === 0 ? (
            <div className="py-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-green-300" />
              <p className="text-slate-400 text-sm">No repeat offenders — great news!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data!.repeat_offenders.map((r, i) => (
                <div key={r.student_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 group">
                  {/* Rank */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-red-100 text-red-600' :
                    i === 1 ? 'bg-orange-100 text-orange-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-sti-blue-pale border border-sti-blue/20 flex items-center justify-center text-sti-blue font-bold text-sm shrink-0">
                    {r.student_name.charAt(0)}
                  </div>

                  {/* Name + number */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{r.student_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.student_number}</p>
                  </div>

                  {/* Count badge */}
                  <span className={`badge font-bold ${
                    r.total >= 5 ? 'bg-red-100 text-red-700' :
                    r.total >= 4 ? 'bg-orange-100 text-orange-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {r.total} violations
                  </span>

                  {/* Link */}
                  <Link
                    to={`/students/${r.student_id}`}
                    className="p-1 rounded-lg hover:bg-sti-blue-pale text-slate-300 hover:text-sti-blue transition-colors opacity-0 group-hover:opacity-100"
                    title="View student"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent violations */}
      {(data?.recent_violations ?? []).length > 0 && (
        <div className="card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><AlertTriangle size={16} /> Recent Violations</span>
            <Link to="/violations" className="text-xs text-sti-blue font-normal hover:underline flex items-center gap-1">
              View all <ExternalLink size={11} />
            </Link>
          </h2>
          <div className="divide-y divide-slate-100">
            {data!.recent_violations.map(v => (
              <div key={v.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-sti-blue-pale border border-sti-blue/20 flex items-center justify-center text-sti-blue font-bold text-sm shrink-0">
                  {v.student_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{v.student_name}</p>
                  <p className="text-xs text-slate-500 truncate">{v.violation_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${
                    v.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    v.severity === 'major'    ? 'bg-orange-100 text-orange-700' :
                    v.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {v.severity}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {format(new Date(v.date_recorded), 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}