// src/pages/Violations.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { violationsApi } from '@/lib/api';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Filter } from 'lucide-react';
import type { Violation, ViolationStatus } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import RecordViolationModal from '@/components/modals/RecordViolationModal';

const STATUSES: ViolationStatus[] = ['pending', 'in_progress', 'resolved', 'appealed', 'dismissed'];

const SEVERITY_BADGE: Record<string, string> = {
  minor: 'badge-minor',
  moderate: 'badge-moderate',
  major: 'badge-major',
  critical: 'badge-critical',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
  appealed: 'badge-appealed',
  dismissed: 'badge-dismissed',
};

export default function ViolationsPage() {
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['violations', 'list', searchQuery, filterStatus],
    queryFn: () =>
      violationsApi.list({
        ...(searchQuery ? { q: searchQuery } : { limit: 50 }),
        ...(filterStatus ? { status: filterStatus } : {}),
      }).then(r => r.data.data as Violation[]),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ViolationStatus }) =>
      violationsApi.patch(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['violations'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const violations = data ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Violations
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Record and manage student violations
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-1.5 text-sm self-start sm:self-auto"
        >
          <Plus size={15} /> Record Violation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearchQuery(q)}
            placeholder="Search by student name…"
            className="w-full pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Loading violations…
          </div>
        ) : violations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <AlertTriangle size={24} className="mx-auto mb-2 text-slate-400" />
            No violations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Violation</th>
                  <th className="hidden sm:table-cell">Student ID</th>
                  <th className="hidden md:table-cell">Date</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Action</th>
                </tr>
              </thead>

              <tbody>
                {violations.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {v.violation_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {v.officer_name}
                        </p>
                      </div>
                    </td>

                    <td className="hidden sm:table-cell">
                      <Link
                        to={`/students/${v.student_id}`}
                        className="text-amber-600 hover:text-amber-700 font-mono text-sm"
                      >
                        {v.student_id}
                      </Link>
                    </td>

                    <td className="hidden md:table-cell text-slate-600 text-sm">
                      {format(new Date(v.date_recorded), 'MMM d, yyyy')}
                    </td>

                    <td>
                      <span className={`badge ${SEVERITY_BADGE[v.severity] ?? ''}`}>
                        {v.severity}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${STATUS_BADGE[v.status] ?? ''}`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="hidden lg:table-cell">
                      <select
                        value={v.status}
                        onChange={e =>
                          patchMutation.mutate({
                            id: v.id,
                            status: e.target.value as ViolationStatus,
                          })
                        }
                        className="text-xs py-1 px-2"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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