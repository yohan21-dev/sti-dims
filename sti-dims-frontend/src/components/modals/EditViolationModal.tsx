// src/components/modals/EditViolationModal.tsx
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { violationsApi, violationTypesApi } from '@/lib/api';
import type { Violation, ViolationStatus } from '@/types';

type ViolationType = {
  id: number;
  violation_name: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  default_hours?: number;
};

type FullViolation = Violation & {
  violation_type_id?: number;
  officer_notes?: string | null;
};

type Props = {
  violation: Violation;
  onClose: () => void;
  onSuccess: () => void;
};

const STATUSES: ViolationStatus[] = [
  'pending',
  'in_progress',
  'resolved',
  'appealed',
  'dismissed',
];

export default function EditViolationModal({
  violation,
  onClose,
  onSuccess,
}: Props) {
  const qc = useQueryClient();

  const [violationTypeId, setViolationTypeId] = useState('');
  const [dateRecorded, setDateRecorded] = useState('');
  const [status, setStatus] = useState<ViolationStatus>('pending');
  const [officerNotes, setOfficerNotes] = useState('');

  const { data: fullViolation, isLoading: loadingViolation } = useQuery<FullViolation>({
    queryKey: ['violation', violation.id],
    queryFn: () =>
      violationsApi
        .get(violation.id)
        .then(r => r.data.data as FullViolation),
  });

  const { data: violationTypes = [], isLoading: loadingTypes } = useQuery<ViolationType[]>({
    queryKey: ['violation-types'],
    queryFn: () =>
      violationTypesApi
        .list()
        .then(r => r.data.data as ViolationType[]),
  });

  useEffect(() => {
    const source = fullViolation ?? violation;

    if (source.violation_type_id) {
      setViolationTypeId(String(source.violation_type_id));
    }

    if (source.date_recorded) {
      setDateRecorded(String(source.date_recorded).slice(0, 10));
    }

    if (source.status) {
      setStatus(source.status as ViolationStatus);
    }

    if ('officer_notes' in source) {
      setOfficerNotes(source.officer_notes ?? '');
    }
  }, [fullViolation, violation]);

  const mutation = useMutation({
    mutationFn: () =>
      violationsApi.patch(violation.id, {
        violation_type_id: Number(violationTypeId),
        date_recorded: dateRecorded,
        status,
        officer_notes: officerNotes,
      }),
    onSuccess: () => {
      toast.success('Violation updated');
      qc.invalidateQueries({ queryKey: ['violations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['student'] });
      qc.invalidateQueries({ queryKey: ['violation', violation.id] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update violation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!violationTypeId) {
      toast.error('Please select a violation type');
      return;
    }

    if (!dateRecorded) {
      toast.error('Please select a date');
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display font-bold text-slate-900">
              Edit Violation
            </h2>
            <p className="text-sm text-slate-500">
              Update the violation details and status
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {loadingViolation ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Editing existing violation</p>
                <p className="text-xs">
                  This will update the violation record. It will not delete attached files.
                </p>
              </div>
            </div>

            <div>
              <label className="input-label">Violation Type</label>
              <select
                value={violationTypeId}
                onChange={e => setViolationTypeId(e.target.value)}
                className="w-full text-sm"
              >
                <option value="">
                  {loadingTypes ? 'Loading violation types…' : 'Select violation type'}
                </option>

                {violationTypes.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.violation_name} — {v.severity}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Date Recorded</label>
              <input
                type="date"
                value={dateRecorded}
                onChange={e => setDateRecorded(e.target.value)}
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="input-label">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ViolationStatus)}
                className="w-full text-sm"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Officer Notes</label>
              <textarea
                value={officerNotes}
                onChange={e => setOfficerNotes(e.target.value)}
                placeholder="Update notes about this violation…"
                rows={4}
                className="w-full text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={15} />
                {mutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}