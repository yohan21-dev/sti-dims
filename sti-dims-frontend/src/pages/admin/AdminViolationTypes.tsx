import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { violationTypesApi, api } from '@/lib/api';
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  AlertTriangle, CheckCircle, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ViolationType, Severity } from '@/types';

const SEVERITIES: Severity[] = ['critical', 'major', 'moderate', 'minor'];

const SEV_COLORS: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  major:    'bg-orange-100 text-orange-700 border-orange-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  minor:    'bg-blue-100 text-blue-700 border-blue-200',
};

const EMPTY: Omit<ViolationType, 'id'> = {
  violation_name: '',
  description: '',
  severity: 'minor',
  default_hours: 0,
};

function ViolationTypeModal({
  initial,
  onClose,
  onSuccess,
}: {
  initial?: ViolationType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState<Omit<ViolationType, 'id'>>(
    initial ? {
      violation_name: initial.violation_name,
      description:   initial.description ?? '',
      severity:      initial.severity,
      default_hours: initial.default_hours,
    } : { ...EMPTY }
  );

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? api.put(`/violation_types/index.php?id=${initial!.id}`, form)
        : api.post('/violation_types/index.php', form),
    onSuccess: () => {
      toast.success(isEdit ? 'Violation type updated' : 'Violation type created');
      qc.invalidateQueries({ queryKey: ['violation_types'] });
      qc.invalidateQueries({ queryKey: ['violation-types'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to save'),
  });

  const set = (k: keyof typeof form, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-lg w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sti-blue-pale flex items-center justify-center">
              <AlertTriangle size={18} className="text-sti-blue" />
            </div>
            <h2 className="font-display font-bold text-sti-blue text-base">
              {isEdit ? 'Edit Violation Type' : 'New Violation Type'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="form-group">
            <label className="input-label">Violation Name <span className="text-red-500">*</span></label>
            <input
              value={form.violation_name}
              onChange={e => set('violation_name', e.target.value)}
              placeholder="e.g. Use of Mobile Phone During Class"
              className="w-full"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Describe this violation type…"
              className="w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="input-label">Severity <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={form.severity}
                  onChange={e => set('severity', e.target.value as Severity)}
                  className="w-full"
                >
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {form.severity && (
                <span className={`mt-1.5 inline-flex text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${SEV_COLORS[form.severity]}`}>
                  {form.severity}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="input-label">Default Service Hours</label>
              <input
                type="number"
                min={0}
                max={500}
                value={form.default_hours}
                onChange={e => set('default_hours', Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-400 mt-1">0 = no community service by default</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.violation_name.trim()}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
          >
            {mutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <><Save size={15} /> {isEdit ? 'Save Changes' : 'Create Type'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  item,
  onClose,
  onSuccess,
}: {
  item: ViolationType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.delete(`/violation_types/index.php?id=${item.id}`),
    onSuccess: () => {
      toast.success('Violation type deleted');
      qc.invalidateQueries({ queryKey: ['violation_types'] });
      qc.invalidateQueries({ queryKey: ['violation-types'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to delete'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-sm w-full">
        <div className="modal-header">
          <h2 className="font-display font-bold text-red-600">Delete Violation Type</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
            <p className="font-semibold mb-1">⚠ This action cannot be undone</p>
            <p>Deleting <strong>"{item.violation_name}"</strong> will soft-delete it. Existing violation records referencing this type will remain intact.</p>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-danger text-sm px-5 py-2 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminViolationTypes() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<ViolationType | null>(null);
  const [deleting, setDeleting]     = useState<ViolationType | null>(null);
  const [filterSev, setFilterSev]   = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['violation_types'],
    queryFn: () =>
      violationTypesApi.list().then(r => r.data.data as ViolationType[]),
  });

  const types = (data ?? []).filter(t =>
    filterSev ? t.severity === filterSev : true
  );

  // Group by severity for display
  const grouped = SEVERITIES.reduce((acc, sev) => {
    acc[sev] = types.filter(t => t.severity === sev);
    return acc;
  }, {} as Record<Severity, ViolationType[]>);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-slate-800">Violation Types</h2>
          <p className="text-sm text-slate-500">{data?.length ?? 0} types configured</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filterSev}
              onChange={e => setFilterSev(e.target.value)}
              className="text-sm pr-8"
            >
              <option value="">All Severities</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus size={15} /> New Type
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 className="mx-auto mb-3 text-sti-blue animate-spin" size={24} />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {SEVERITIES.map(sev => {
            const group = grouped[sev];
            if (!group.length) return null;
            return (
              <div key={sev} className="card overflow-hidden p-0">
                <div className={`px-5 py-3 border-b border-slate-100 flex items-center gap-2 ${
                  sev === 'critical' ? 'bg-red-50' :
                  sev === 'major'    ? 'bg-orange-50' :
                  sev === 'moderate' ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                  <span className={`badge uppercase ${SEV_COLORS[sev]}`}>{sev}</span>
                  <span className="text-xs text-slate-500">{group.length} type{group.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th className="hidden md:table-cell">Description</th>
                      <th>Default Hours</th>
                      <th className="text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map(t => (
                      <tr key={t.id}>
                        <td>
                          <p className="font-semibold text-slate-800 text-sm">{t.violation_name}</p>
                        </td>
                        <td className="hidden md:table-cell text-slate-500 text-sm max-w-xs">
                          <p className="truncate">{t.description || '—'}</p>
                        </td>
                        <td>
                          {t.default_hours > 0
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-sti-blue bg-sti-blue-pale px-2 py-0.5 rounded-full">{t.default_hours} hrs</span>
                            : <span className="text-slate-400 text-xs">None</span>}
                        </td>
                        <td className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditing(t)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleting(t)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {types.length === 0 && (
            <div className="card p-10 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-slate-200" />
              <p className="text-slate-400 text-sm">No violation types found</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <ViolationTypeModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <ViolationTypeModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteConfirmModal
          item={deleting}
          onClose={() => setDeleting(null)}
          onSuccess={() => setDeleting(null)}
        />
      )}
    </div>
  );
}