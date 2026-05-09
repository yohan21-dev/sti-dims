// src/pages/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import {
  AlertTriangle, Briefcase, TrendingUp, Users,
  Clock, CheckCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import type { DashboardStats, Severity } from '@/types';
import { format, parseISO } from 'date-fns';

const SEVERITY_COLORS: Record<Severity, string> = {
  minor: '#60A5FA',
  moderate: '#FBBF24',
  major: '#F97316',
  critical: '#EF4444',
};

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
    day: format(parseISO(d.day), 'MMM d'),
    count: Number(d.count),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-black">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Overview of discipline activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          label="This Month"
          value={isLoading ? '—' : String(data?.violations_this_month ?? 0)}
          sub="violations"
          color="gold"
        />
        <StatCard
          icon={<Briefcase size={18} className="text-blue-600" />}
          label="Pending Deploy"
          value={isLoading ? '—' : String(data?.pending_deployments ?? 0)}
          sub="assignments"
          color="blue"
        />
        <StatCard
          icon={<Clock size={18} className="text-yellow-600" />}
          label="Pending"
          value={isLoading ? '—' : String(statusCounts['pending'] ?? 0)}
          sub="violations"
          color="yellow"
        />
        <StatCard
          icon={<CheckCircle size={18} className="text-green-600" />}
          label="Resolved"
          value={isLoading ? '—' : String(statusCounts['resolved'] ?? 0)}
          sub="violations"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-600" /> Violations — Last 30 Days
          </h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
          ) : trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F0A800" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F0A800" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#0F172A',
                  }}
                  labelStyle={{ color: '#B7791F' }}
                />
                <Area type="monotone" dataKey="count" stroke="#F0A800" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By severity */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" /> By Severity
          </h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.by_severity ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />

                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="severity"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={65}
                  />
                <Tooltip
                  contentStyle={{ background: '#131B42', border: '1px solid #1B2550', borderRadius: '8px', color: '#E2E8F0' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {(data?.by_severity ?? []).map(entry => (
                    <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity as Severity] ?? '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top types + repeat offenders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-600" /> Top Violation Types
          </h2>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (data?.top_types ?? []).length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {data!.top_types.map((t, i) => (
                <div key={t.violation_name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-4 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{t.violation_name}</span>
                      <span className="text-sm font-semibold text-amber-600">{t.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(t.count / (data!.top_types[0]?.count ?? 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-amber-600" /> Repeat Offenders (3+)
          </h2>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (data?.repeat_offenders ?? []).length === 0 ? (
            <p className="text-slate-500 text-sm">No repeat offenders found</p>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Total Violations</th>
                </tr>
              </thead>
              <tbody>
                {data!.repeat_offenders.map(r => (
                  <tr key={r.student_id}>
                    <td className="font-mono text-slate-300">{r.student_id}</td>
                    <td>
                      <span className="badge badge-major">{r.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'gold' | 'blue' | 'yellow' | 'green';
}) {
  const bg: Record<string, string> = {
    gold: 'bg-amber-50 border-amber-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
  };

  return (
    <div className={`card border ${bg[color]} animate-slide-up`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${bg[color]}`}>{icon}</div>
        <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          {label}
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-slate-500 text-xs">{sub}</p>
    </div>
  );
}