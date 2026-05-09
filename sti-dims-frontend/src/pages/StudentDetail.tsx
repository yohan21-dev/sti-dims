// src/pages/StudentDetail.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentsApi, violationsApi } from '@/lib/api';
import {
  ArrowLeft, AlertTriangle, FileText, Briefcase,
  Plus, Clock, CheckCircle, XCircle, Upload,
} from 'lucide-react';
import type { Student, Violation } from '@/types';
import { format } from 'date-fns';
import RecordViolationModal from '@/components/modals/RecordViolationModal';
import UploadFileModal from '@/components/modals/UploadFileModal';

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

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={12} />,
  in_progress: <AlertTriangle size={12} />,
  resolved: <CheckCircle size={12} />,
  dismissed: <XCircle size={12} />,
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showViolModal, setShowViolModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(Number(id)).then(r => r.data.data as Student),
    enabled: !!id,
  });

  const { data: violationsData, isLoading: loadingViol, refetch: refetchViol } = useQuery({
    queryKey: ['violations', 'student', id],
    queryFn: () => violationsApi.byStudent(Number(id)).then(r => r.data.data as Violation[]),
    enabled: !!id,
  });

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const student = studentData;
  const violations = violationsData ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              {student ? `${student.last_name}, ${student.first_name}` : 'Student'}
            </h1>
            <p className="text-slate-500 text-sm">
              {student?.student_number} · {student?.program} · {student?.section}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
          >
            <Upload size={14} /> Upload File
          </button>

          <button
            onClick={() => setShowViolModal(true)}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
          >
            <Plus size={14} /> Record Violation
          </button>
        </div>
      </div>

      {/* Stats row */}
      {student?.violation_stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Total Violations',
              value: student.violation_stats.total,
              color: 'text-amber-600',
            },
            {
              label: 'Pending',
              value: student.violation_stats.pending,
              color: 'text-yellow-600',
            },
            {
              label: 'Resolved',
              value: student.violation_stats.resolved,
              color: 'text-green-600',
            },
          ].map(s => (
            <div key={s.label} className="card text-center py-3">
              <p className={`font-display text-2xl font-bold ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Violations timeline */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" />
            Violation History
          </h2>

          {loadingViol ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : violations.length === 0 ? (
            <p className="text-slate-500 text-sm">No violations on record.</p>
          ) : (
            <div className="space-y-3">
              {violations.map(v => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {v.violation_name}
                      </p>

                      <p className="text-slate-500 text-xs mt-0.5">
                        {format(new Date(v.date_recorded), 'MMM d, yyyy')} · by {v.officer_name}
                        {v.offense_count > 1 && (
                          <span className="ml-2 text-orange-600 font-medium">
                            {v.offense_count === 2 ? '2nd' : '3rd+'} offense
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`badge ${SEVERITY_BADGE[v.severity] ?? ''}`}>
                        {v.severity}
                      </span>

                      <span className={`badge ${STATUS_BADGE[v.status] ?? ''} flex items-center gap-1`}>
                        {STATUS_ICON[v.status]}
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {v.officer_notes && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      "{v.officer_notes}"
                    </p>
                  )}

                  {v.department && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1.5">
                      <Briefcase size={11} />
                      <span>
                        Deployed: {v.department} · {v.hours_completed ?? 0}/{v.hours_required ?? 0} hrs
                      </span>

                      {v.deploy_status && (
                        <span className={`badge ${STATUS_BADGE[v.deploy_status] ?? ''} ml-auto`}>
                          {v.deploy_status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Files */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={15} className="text-amber-600" />
            Documents
          </h2>

          {!student?.files || student.files.length === 0 ? (
            <p className="text-slate-500 text-sm">No files uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {student.files.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                >
                  <FileText size={14} className="text-slate-500 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-700">
                      {f.original_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {f.category.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showViolModal && student && (
        <RecordViolationModal
          studentId={student.id}
          studentName={`${student.last_name}, ${student.first_name}`}
          onClose={() => setShowViolModal(false)}
          onSuccess={() => {
            setShowViolModal(false);
            refetchViol();
          }}
        />
      )}

      {showUploadModal && student && (
        <UploadFileModal
          studentId={student.id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}