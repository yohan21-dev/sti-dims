// src/pages/Violations.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { violationsApi } from '@/lib/api';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Filter, ChevronDown } from 'lucide-react';
import type { Violation, ViolationStatus } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import RecordViolationModal from '@/components/modals/RecordViolationModal';

const STATUSES: ViolationStatus[] = ['pending', 'in_progress', 'resolved', 'appealed', 'dismissed'];

const SEVERITY_BADGE: Record<string, string> = {
  minor:    'bg-blue-100 text-blue-700',
  moderate: 'bg-amber-100 text-amber-700',
  major:    'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
  appealed:    'bg-purple-100 text-purple-700',
  dismissed:   'bg-slate-100 text-slate-600',
};

// Extended type to include student_name from backend
type ViolationWithName = Violation & { student_name?: string };

export default function ViolationsPage() {
  const [showModal,     setShowModal]     = useState(false);
  const [filterStatus,  setFilterStatus]  = useState<string>('');
  const [q,             setQ]             = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['violations', 'list', searchQuery, filterStatus],
    queryFn: () =>
      violationsApi.list({
        ...(searchQuery    ? { q: searchQuery }         : { limit: 50 }),
        ...(filterStatus   ? { status: filterStatus }   : {}),
      }).then(r => r.data.data as ViolationWithName[]),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ViolationStatus }) =>
      violationsApi.patch(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['violations'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const violations = data ?? [];

  // Quick counts for the pill filters
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = violations.filter(v => v.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Violations</h1>
          <p className="section-sub">Record and track student discipline cases</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-1.5 text-sm self-start sm:self-auto"
        >
          <Plus size={15} /> Record Violation
        </button>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearchQuery(q)}
            placeholder="Search by student name… (press Enter)"
            className="w-full pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm pr-8 appearance-none"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status pill filter */}
      {!searchQuery && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterStatus === '' ? 'bg-sti-blue text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-sti-blue/30'
            }`}
          >
            All <span className="ml-1 opacity-70">{violations.length}</span>
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                filterStatus === s
                  ? `${STATUS_BADGE[s]} ring-1 ring-current`
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-sti-blue/30'
              }`}
            >
              {s.replace('_', ' ')}
              {counts[s] > 0 && <span className="ml-1 opacity-70">{counts[s]}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-sti-blue/20 border-t-sti-blue rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading violations…</p>
          </div>
        ) : violations.length === 0 ? (
          <div className="p-10 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">No violations found</p>
            {searchQuery && (
              <button onClick={() => { setQ(''); setSearchQuery(''); }}
                className="text-sti-blue text-sm underline mt-2">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Violation</th>
                  <th className="hidden md:table-cell">Date</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Update Status</th>
                </tr>
              </thead>
              <tbody>
                {violations.map(v => (
                  <tr key={v.id}>
                    {/* Student name — click to go to profile */}
                    <td>
                      <Link
                        to={`/students/${v.student_id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-sti-blue-pale border border-sti-blue/20 flex items-center justify-center text-sti-blue font-bold text-xs shrink-0">
                          {(v.student_name ?? '?').charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sti-blue group-hover:underline text-sm leading-tight">
                            {v.student_name ?? `ID: ${v.student_id}`}
                          </p>
                          <p className="text-xs text-slate-400 hidden sm:block">by {v.officer_name}</p>
                        </div>
                      </Link>
                    </td>

                    {/* Violation name */}
                    <td>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{v.violation_name}</p>
                        {v.offense_count > 1 && (
                          <span className="inline-block mt-0.5 text-xs text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded">
                            {v.offense_count === 2 ? '2nd' : '3rd+'} offense
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="hidden md:table-cell text-slate-500 text-sm">
                      {format(new Date(v.date_recorded), 'MMM d, yyyy')}
                    </td>

                    {/* Severity */}
                    <td>
                      <span className={`badge ${SEVERITY_BADGE[v.severity] ?? ''}`}>
                        {v.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge flex items-center gap-1 w-fit ${STATUS_BADGE[v.status] ?? ''}`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Inline update */}
                    <td className="hidden lg:table-cell">
                      <select
                        value={v.status}
                        onChange={e =>
                          patchMutation.mutate({ id: v.id, status: e.target.value as ViolationStatus })
                        }
                        className="text-xs py-1 px-2"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        {!isLoading && violations.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
            Showing {violations.length} violation{violations.length !== 1 ? 's' : ''}
            {filterStatus && ` · filtered by "${filterStatus.replace('_', ' ')}"`}
          </div>
        )}
      </div>

      {/* Record Violation Modal */}
      {showModal && (
        <RecordViolationModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ['violations'] });
          }}
        />
      )}
    </div>
  );
}