// src/components/modals/RecordViolationModal.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { violationsApi, violationTypesApi, studentsApi } from '@/lib/api';
import {
  X, Search, AlertTriangle, Briefcase,
  ChevronDown, CheckCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ViolationType, Student } from '@/types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  studentId?: number;
  studentName?: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  minor:    'bg-blue-100 text-blue-700 border-blue-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  major:    'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export default function RecordViolationModal({ onClose, onSuccess, studentId, studentName }: Props) {
  // ── Student search (only if no studentId preset) ──────────────────
  const [studentSearch, setStudentSearch]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown]       = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Form state ────────────────────────────────────────────────────
  const [violationTypeId, setViolationTypeId] = useState<number | ''>('');
  const [dateRecorded, setDateRecorded]       = useState(new Date().toISOString().split('T')[0]);
  const [officerNotes, setOfficerNotes]       = useState('');
  const [addDeploy, setAddDeploy]             = useState(false);
  const [department, setDepartment]           = useState('');
  const [supervisorName, setSupervisorName]   = useState('');
  const [hoursRequired, setHoursRequired]     = useState<number | ''>('');
  const [dateAssigned, setDateAssigned]       = useState(new Date().toISOString().split('T')[0]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Data queries ──────────────────────────────────────────────────
  const { data: typesData } = useQuery({
    queryKey: ['violation_types'],
    queryFn: () => violationTypesApi.list().then(r => r.data.data as ViolationType[]),
  });
  const violationTypes = typesData ?? [];

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['student_search_modal', studentSearch],
    queryFn: () =>
      studentsApi.search(studentSearch, 1)
        .then(r => r.data.data as Student[]),
    enabled: studentSearch.length >= 2 && !studentId,
  });
  const searchResults = searchData ?? [];

  // Fill hours from violation type default
  const selectedType = violationTypes.find(t => t.id === violationTypeId);
  useEffect(() => {
    if (selectedType?.default_hours) {
      setHoursRequired(selectedType.default_hours);
      setAddDeploy(selectedType.default_hours > 0);
    }
  }, [selectedType]);

  // ── Submit ────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => violationsApi.create(payload),
    onSuccess: () => {
      toast.success('Violation recorded successfully');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to record violation';
      toast.error(msg);
    },
  });

  const resolvedStudentId = studentId ?? selectedStudent?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedStudentId) { toast.error('Please select a student'); return; }
    if (!violationTypeId)   { toast.error('Please select a violation type'); return; }

    const payload: Record<string, unknown> = {
      student_id:        resolvedStudentId,
      violation_type_id: violationTypeId,
      date_recorded:     dateRecorded,
      officer_notes:     officerNotes || null,
    };

    if (addDeploy && department && hoursRequired) {
      payload.deploy = { department, supervisor_name: supervisorName || null, hours_required: hoursRequired, date_assigned: dateAssigned };
    }

    mutation.mutate(payload);
  };

  // ── Resolved display name ─────────────────────────────────────────
  const displayName = studentName ?? (selectedStudent ? `${selectedStudent.last_name}, ${selectedStudent.first_name}` : null);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-lg w-full">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sti-blue-pale flex items-center justify-center">
              <AlertTriangle size={18} className="text-sti-blue" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sti-blue text-base">Record Violation</h2>
              {displayName && <p className="text-xs text-slate-500 mt-0.5">{displayName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Student selector (only if no preset) */}
            {!studentId && (
              <div className="form-group" ref={searchRef}>
                <label className="input-label">
                  Student <span className="text-red-500">*</span>
                </label>
                {selectedStudent ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-sti-blue bg-sti-blue-pale">
                    <div className="w-8 h-8 rounded-full bg-sti-blue flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {selectedStudent.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sti-blue text-sm">{selectedStudent.last_name}, {selectedStudent.first_name}</p>
                      <p className="text-xs text-sti-blue/60">{selectedStudent.student_number} · {selectedStudent.program}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(''); }}
                      className="text-sti-blue/60 hover:text-sti-blue transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search by name or student number…"
                      className="w-full pl-9"
                    />
                    {searching && (
                      <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                    )}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-card-lg overflow-hidden max-h-48 overflow-y-auto">
                        {searchResults.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setSelectedStudent(s); setStudentSearch(''); setShowDropdown(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sti-blue-pale text-left transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="w-7 h-7 rounded-full bg-sti-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {s.last_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{s.last_name}, {s.first_name}</p>
                              <p className="text-xs text-slate-500">{s.student_number} · {s.program}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && studentSearch.length >= 2 && !searching && searchResults.length === 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-card p-3 text-center text-sm text-slate-400">
                        No students found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Violation Type */}
            <div className="form-group">
              <label className="input-label">
                Violation Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={violationTypeId}
                  onChange={e => setViolationTypeId(Number(e.target.value) || '')}
                  className="w-full pr-8"
                  required
                >
                  <option value="">Select violation type…</option>
                  {(['critical','major','moderate','minor'] as const).map(sev => {
                    const group = violationTypes.filter(t => t.severity === sev);
                    if (!group.length) return null;
                    return (
                      <optgroup key={sev} label={`${sev.toUpperCase()} — ${sev === 'critical' ? 'Most Severe' : ''}`}>
                        {group.map(t => (
                          <option key={t.id} value={t.id}>{t.violation_name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {/* Severity badge preview */}
              {selectedType && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${SEVERITY_COLOR[selectedType.severity]}`}>
                    {selectedType.severity}
                  </span>
                  {selectedType.description && (
                    <p className="text-xs text-slate-500">{selectedType.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="input-label">Date of Incident <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={dateRecorded}
                onChange={e => setDateRecorded(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full"
              />
            </div>

            {/* Officer notes */}
            <div className="form-group">
              <label className="input-label">Officer Notes</label>
              <textarea
                value={officerNotes}
                onChange={e => setOfficerNotes(e.target.value)}
                rows={3}
                placeholder="Describe the incident, circumstances, witnesses…"
                className="w-full resize-none"
              />
            </div>

            {/* Community Service Deployment */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setAddDeploy(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Briefcase size={15} className="text-sti-blue" />
                  <span className="font-semibold text-slate-700 text-sm">Assign Community Service</span>
                  {selectedType?.default_hours ? (
                    <span className="text-xs text-slate-400">({selectedType.default_hours} hrs default)</span>
                  ) : null}
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${addDeploy ? 'bg-sti-blue' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${addDeploy ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>

              {addDeploy && (
                <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group col-span-2">
                      <label className="input-label">Department / Office</label>
                      <input
                        type="text"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        placeholder="e.g. Library, NSTP Office, Registrar"
                        className="w-full"
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Supervisor Name</label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={e => setSupervisorName(e.target.value)}
                        placeholder="Optional"
                        className="w-full"
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Hours Required</label>
                      <input
                        type="number"
                        value={hoursRequired}
                        onChange={e => setHoursRequired(Number(e.target.value) || '')}
                        min={1}
                        max={200}
                        placeholder="e.g. 8"
                        className="w-full"
                      />
                    </div>
                    <div className="form-group col-span-2">
                      <label className="input-label">Date Assigned</label>
                      <input
                        type="date"
                        value={dateAssigned}
                        onChange={e => setDateAssigned(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !resolvedStudentId || !violationTypeId}
              className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
            >
              {mutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Recording…</>
                : <><CheckCircle size={15} /> Record Violation</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}