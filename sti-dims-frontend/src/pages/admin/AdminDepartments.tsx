import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '@/lib/api';
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  Building2, MapPin, ToggleLeft, ToggleRight, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Department } from '@/types';

// ── Modal ─────────────────────────────────────────────────────────────
function DepartmentModal({
  initial,
  onClose,
  onSuccess,
}: {
  initial?: Department;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc     = useQueryClient();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    code:        initial?.code        ?? '',
    description: initial?.description ?? '',
    location:    initial?.location    ?? '',
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? departmentsApi.update(initial!.id, form)
        : departmentsApi.create(form),
    onSuccess: () => {
      toast.success(isEdit ? 'Department updated' : 'Department created');
      qc.invalidateQueries({ queryKey: ['departments'] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to save'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-lg w-full flex flex-col" style={{ maxHeight: 'calc(100dvh - 2rem)' }}>
        <div className="modal-header shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sti-blue-pale flex items-center justify-center">
              <Building2 size={18} className="text-sti-blue" />
            </div>
            <h2 className="font-display font-bold text-sti-blue text-base">
              {isEdit ? 'Edit Department' : 'New Department'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group col-span-2">
              <label className="input-label">Department Name <span className="text-red-500">*</span></label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Library"
                className="w-full"
              />
            </div>
            <div className="form-group">
              <label className="input-label">Code <span className="text-red-500">*</span></label>
              <input
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="LIB"
                maxLength={10}
                className="w-full font-mono uppercase"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Brief description of this department…"
              className="w-full resize-none"
            />
          </div>

          <div className="form-group">
            <label className="input-label flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" /> Location
            </label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. 3rd Floor, Main Building"
              className="w-full"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
            <p className="font-semibold mb-0.5 flex items-center gap-1.5">
              <Users size={13} /> Assigning Department Heads
            </p>
            <p className="text-xs text-blue-600">
              To assign staff to this department, go to <strong>Admin → Users</strong>, edit the user,
              set their role to <strong>Dept Head</strong>, and select this department.
              Multiple users can be assigned to the same department.
            </p>
          </div>
        </div>

        <div className="modal-footer shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name.trim() || !form.code.trim()}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
          >
            {mutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <><Save size={15} /> {isEdit ? 'Save Changes' : 'Create Department'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function AdminDepartments() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Department | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => departmentsApi.list(true).then(r => r.data.data as Department[]),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: number }) =>
      departmentsApi.update(id, { is_active }),
    onSuccess: () => {
      toast.success('Department updated');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => {
      toast.success('Department deactivated');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to delete'),
  });

  const departments = data ?? [];
  const active   = departments.filter(d => d.is_active);
  const inactive = departments.filter(d => !d.is_active);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-slate-800">Departments</h2>
          <p className="text-sm text-slate-500">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-1.5 text-sm self-start sm:self-auto"
        >
          <Plus size={15} /> New Department
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',       value: departments.length,                                    color: 'text-sti-blue',  bg: 'bg-sti-blue-pale border-blue-200' },
          { label: 'Active',      value: active.length,                                         color: 'text-green-600', bg: 'bg-green-50 border-green-200'     },
          { label: 'Staffed',     value: departments.filter(d => Number(d.head_count) > 0 && d.is_active).length,
                                                                                                color: 'text-purple-600',bg: 'bg-purple-50 border-purple-200'   },
        ].map(s => (
          <div key={s.label} className={`card text-center py-3 border ${s.bg}`}>
            <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 className="mx-auto mb-3 text-sti-blue animate-spin" size={24} />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Department</th>
                <th className="hidden sm:table-cell">Code</th>
                <th className="hidden md:table-cell">Location</th>
                <th>Heads</th>
                <th>Status</th>
                <th className="text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                    No departments yet. Create your first one above.
                  </td>
                </tr>
              )}
              {departments.map(dept => (
                <tr key={dept.id} className={!dept.is_active ? 'opacity-50' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sti-blue-pale border border-sti-blue/20 flex items-center justify-center shrink-0">
                        <Building2 size={15} className="text-sti-blue" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{dept.name}</p>
                        {dept.description && (
                          <p className="text-xs text-slate-400 truncate max-w-[180px]">{dept.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                      {dept.code}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-sm text-slate-500">
                    {dept.location
                      ? <span className="flex items-center gap-1"><MapPin size={11} />{dept.location}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td>
                    {dept.head_names ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {dept.head_names.split(', ').slice(0, 3).map((name, i) => (
                            <div
                              key={i}
                              title={name}
                              className="w-6 h-6 rounded-full bg-sti-blue text-white text-xs flex items-center justify-center font-bold border-2 border-white shrink-0"
                            >
                              {name.charAt(0)}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-600 truncate max-w-[110px]">
                          {Number(dept.head_count) === 1
                            ? dept.head_names
                            : `${dept.head_count} heads`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive.mutate({ id: dept.id, is_active: dept.is_active ? 0 : 1 })}
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                        dept.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {dept.is_active
                        ? <><ToggleRight size={13} /> Active</>
                        : <><ToggleLeft size={13} /> Inactive</>}
                    </button>
                  </td>
                  <td className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(dept)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {dept.is_active && (
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate "${dept.name}"? It will be hidden from dropdowns and all assigned heads will be unlinked.`)) {
                              deleteMutation.mutate(dept.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <DepartmentModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <DepartmentModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => setEditing(null)}
        />
      )}
    </div>
  );
}