// src/pages/StudentDetail.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentsApi, violationsApi } from '@/lib/api';
import {
  ArrowLeft, AlertTriangle, FileText, Briefcase,
  Plus, Clock, CheckCircle, XCircle, Upload, Download, Pencil,
} from 'lucide-react';
import type { Student, Violation } from '@/types';
import { format } from 'date-fns';
import RecordViolationModal from '@/components/modals/RecordViolationModal';
import UploadFileModal from '@/components/modals/UploadFileModal';
import EditViolationModal from '@/components/modals/EditViolationModal';


const SEVERITY_BADGE: Record<string, string> = {
  minor: 'badge-minor', moderate: 'badge-moderate',
  major: 'badge-major', critical: 'badge-critical',
};
const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending', in_progress: 'badge-in_progress',
  resolved: 'badge-resolved', appealed: 'badge-appealed', dismissed: 'badge-dismissed',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:     <Clock size={11} />,
  in_progress: <AlertTriangle size={11} />,
  resolved:    <CheckCircle size={11} />,
  dismissed:   <XCircle size={11} />,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showViolModal,   setShowViolModal]   = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(Number(id)).then(r => r.data.data as Student),
    enabled: !!id,
  });

  const { data: violations, isLoading: loadingViol, refetch: refetchViol } = useQuery({
    queryKey: ['violations', 'student', id],
    queryFn: () => violationsApi.byStudent(Number(id)).then(r => r.data.data as Violation[]),
    enabled: !!id,
  });

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-sti-blue/20 border-t-sti-blue rounded-full animate-spin" />
      </div>
    );
  }

  const vList = violations ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/students" className="p-2 rounded-xl hover:bg-sti-blue-pale text-slate-500 hover:text-sti-blue transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-sti-blue flex items-center justify-center text-white font-bold font-display text-lg shrink-0">
              {student?.last_name?.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-sti-blue leading-tight">
                {student ? `${student.last_name}, ${student.first_name}` : 'Student'}
              </h1>
              <p className="text-slate-500 text-sm">{student?.student_number} · {student?.program} · {student?.section}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button onClick={() => setShowUploadModal(true)} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
            <Upload size={14} /> Upload File
          </button>
          <button onClick={() => setShowViolModal(true)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
            <Plus size={14} /> Record Violation
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      {student?.violation_stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Violations', value: student.violation_stats.total, color: 'text-sti-blue', bg: 'bg-sti-blue-pale border-blue-200' },
            { label: 'Pending',          value: student.violation_stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Resolved',         value: student.violation_stats.resolved, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          ].map(s => (
            <div key={s.label} className={`card text-center py-3 border ${s.bg}`}>
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Violation History ── */}
        <div className="lg:col-span-2 card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center gap-2">
            <AlertTriangle size={15} /> Violation History
          </h2>

          {loadingViol ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : vList.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
              <p className="text-slate-500 text-sm">No violations on record — clean slate!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vList.map(v => (
                <div key={v.id} className="p-4 rounded-xl border border-slate-200 hover:border-sti-blue/30 hover:shadow-card transition-all bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{v.violation_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {format(new Date(v.date_recorded), 'MMM d, yyyy')} · by {v.officer_name}
                        {v.offense_count > 1 && (
                          <span className="ml-2 text-orange-600 font-semibold">
                            {v.offense_count === 2 ? '2nd' : '3rd+'} offense
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`badge ${SEVERITY_BADGE[v.severity] ?? ''}`}>{v.severity}</span>
                      <span className={`badge ${STATUS_BADGE[v.status] ?? ''} flex items-center gap-1`}>
                        {STATUS_ICON[v.status]}{v.status.replace('_', ' ')}
                      </span>
                        <button
                          type="button"
                          onClick={() => setEditingViolation(v)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit violation"
                        >
                          <Pencil size={14} />
                        </button>
                    </div>
                  </div>

                  {v.officer_notes && (
                    <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      "{v.officer_notes}"
                    </p>
                  )}

                  {v.department && (
                    <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <Briefcase size={11} className="text-sti-blue" />
                      <span className="font-medium">Deployed:</span> {v.department}
                      <span className="mx-1">·</span>
                      <span>{v.hours_completed ?? 0}/{v.hours_required ?? 0} hrs</span>
                      {v.deploy_status && (
                        <span className={`badge ${STATUS_BADGE[v.deploy_status] ?? ''} ml-auto`}>{v.deploy_status}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Documents ── */}
        <div className="card">
          <h2 className="font-display font-semibold text-sti-blue mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><FileText size={15} /> Documents</span>
            <button onClick={() => setShowUploadModal(true)} className="p-1 rounded-lg hover:bg-sti-blue-pale text-sti-blue transition-colors" title="Upload file">
              <Upload size={14} />
            </button>
          </h2>

          {(!student?.files || student.files.length === 0) ? (
            <div className="py-6 text-center">
              <FileText size={24} className="mx-auto mb-2 text-slate-200" />
              <p className="text-slate-400 text-sm">No files uploaded yet</p>
              <button onClick={() => setShowUploadModal(true)} className="btn-secondary text-xs mt-3 py-1.5 px-3">
                Upload first file
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {student.files.map(f => (
                <div key={f.id} className="group flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-sti-blue/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-sti-blue-pale flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-sti-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-700 text-sm font-medium">{f.original_name}</p>
                    <p className="text-xs text-slate-400">{f.category.replace(/_/g, ' ')} · {formatBytes(f.file_size)}</p>
                  </div>
                  <a href={`/uploads/${f.file_name}`} target="_blank" rel="noreferrer"
                     className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sti-blue-pale text-sti-blue transition-all">
                    <Download size={13} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showViolModal && student && (
        <RecordViolationModal
          studentId={student.id}
          studentName={`${student.last_name}, ${student.first_name}`}
          onClose={() => setShowViolModal(false)}
          onSuccess={() => { setShowViolModal(false); refetchViol(); }}
        />
      )}
      {showUploadModal && student && (
        <UploadFileModal
          studentId={student.id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { setShowUploadModal(false); }}
        />
      )}
      {editingViolation && (
        <EditViolationModal
          violation={editingViolation}
          onClose={() => setEditingViolation(null)}
          onSuccess={() => {
            setEditingViolation(null);
            refetchViol();
          }}
        />
      )}
    </div>
  );
}