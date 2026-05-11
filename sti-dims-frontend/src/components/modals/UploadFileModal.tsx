// src/components/modals/UploadFileModal.tsx
import { useState, useRef, useCallback } from 'react';
import { filesApi } from '@/lib/api';
import {
  X, Upload, FileText, Image, File,
  CheckCircle, AlertCircle, Loader2, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { FileCategory } from '@/types';

interface Props {
  studentId: number;
  violationId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: FileCategory; label: string }[] = [
  { value: 'incident_report',    label: 'Incident Report'    },
  { value: 'written_statement',  label: 'Written Statement'  },
  { value: 'photo_evidence',     label: 'Photo Evidence'     },
  { value: 'parent_letter',      label: 'Parent / Guardian Letter' },
  { value: 'clearance',          label: 'Clearance'          },
  { value: 'id_photo',           label: 'ID Photo'           },
  { value: 'other',              label: 'Other'              },
];

const ACCEPT = '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx';
const MAX_MB  = 10;

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={18} className="text-sti-blue" />;
  if (mime === 'application/pdf') return <FileText size={18} className="text-red-500" />;
  return <File size={18} className="text-slate-400" />;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function UploadFileModal({ studentId, violationId, onClose, onSuccess }: Props) {
  const [file, setFile]         = useState<File | null>(null);
  const [category, setCategory] = useState<FileCategory>('incident_report');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = (f: File) => {
    setError('');
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ACCEPT.replace(/\./g, '').split(',');
    if (!allowed.includes(ext)) {
      setError(`File type .${ext} is not allowed. Accepted: ${ACCEPT}`);
      return;
    }
    setFile(f);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSet(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }

    setUploading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_id', String(studentId));
    formData.append('category', category);
    if (violationId) formData.append('violation_id', String(violationId));

    try {
      // Simulate progress (real progress needs XMLHttpRequest)
      const interval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 200);
      await filesApi.upload(formData);
      clearInterval(interval);
      setProgress(100);
      toast.success('File uploaded successfully');
      setTimeout(onSuccess, 400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Upload failed. Please try again.';
      setError(msg);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !uploading && onClose()}>
      <div className="modal-panel max-w-md w-full">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sti-blue-pale flex items-center justify-center">
              <Upload size={18} className="text-sti-blue" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sti-blue text-base">Upload File</h2>
              <p className="text-xs text-slate-500 mt-0.5">Max {MAX_MB} MB · JPG, PNG, PDF, DOC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer
                ${dragging
                  ? 'border-sti-blue bg-sti-blue-pale scale-[1.01]'
                  : file
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-300 hover:border-sti-blue hover:bg-sti-blue-pale/30'}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                onChange={onInputChange}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    {fileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{humanSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-sti-blue-pale border border-sti-blue/20 flex items-center justify-center mx-auto">
                    <Upload size={22} className="text-sti-blue" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">Drop file here or <span className="text-sti-blue underline">browse</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">Supports PDF, Word, JPG, PNG up to {MAX_MB} MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="input-label">Document Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`
                      px-3 py-2 rounded-xl border text-sm font-medium text-left transition-all
                      ${category === c.value
                        ? 'bg-sti-blue text-white border-sti-blue shadow-btn'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-sti-blue/40 hover:bg-sti-blue-pale'}
                    `}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-sti-blue" />
                    Uploading…
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sti-blue rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {progress === 100 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
                <CheckCircle size={16} />
                Upload complete!
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={uploading} className="btn-secondary text-sm disabled:opacity-40">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
            >
              {uploading
                ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                : <><Upload size={15} /> Upload File</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}