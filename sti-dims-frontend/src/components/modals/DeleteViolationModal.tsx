import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { violationsApi } from '@/lib/api';
import type { Violation } from '@/types';

interface Props {
  violation: Violation & { student_name?: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteViolationModal({ violation, onClose, onSuccess }: Props) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => violationsApi.delete(violation.id),
    onSuccess: () => {
      toast.success('Violation deleted');
      qc.invalidateQueries({ queryKey: ['violations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['student'] });
      onSuccess();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.error ?? 'Failed to delete violation'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !mutation.isPending && onClose()}>
      <div className="modal-panel max-w-sm w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <h2 className="font-display font-bold text-red-600 text-base">Delete Violation</h2>
          </div>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 space-y-1">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p className="font-semibold">This action cannot be undone</p>
            </div>
            <p className="text-xs text-red-600 pl-5">
              The violation record, any associated deployment, and service logs will be permanently deleted.
              Attached files will be unlinked but not removed from storage.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-1">
            {violation.student_name && (
              <p className="font-semibold text-slate-800">{violation.student_name}</p>
            )}
            <p className="text-slate-600">{violation.violation_name}</p>
            <p className="text-xs text-slate-400">
              {violation.severity} · {violation.date_recorded?.slice(0, 10)}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Deleting…</>
              : <><Trash2 size={15} /> Delete Violation</>}
          </button>
        </div>
      </div>
    </div>
  );
}