// src/pages/Students.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, UserCircle2, AlertCircle, Users } from 'lucide-react';
import type { Student } from '@/types';
import { useDebouncedCallback } from '@/hooks/useDebounce';

export default function StudentsPage() {
  const [q, setQ]         = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage]   = useState(1);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setQuery(val); setPage(1);
  }, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', query, page],
    queryFn: () =>
      studentsApi.search(query, page).then(r => r.data as {
        success: boolean;
        data: Student[];
        meta: { total: number; page: number; pages: number };
      }),
  });

  const students = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="section-title">Students</h1>
          <p className="section-sub">Search and view student records from STI Cubao</p>
        </div>
        {meta && (
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Users size={14} className="text-sti-blue" />
            <span className="font-semibold text-sti-blue">{meta.total.toLocaleString()}</span> students total
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); debouncedSearch(e.target.value); }}
          placeholder="Search by name or student number…"
          className="w-full pl-10"
        />
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-sti-blue/20 border-t-sti-blue rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Searching students…</p>
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-red-600 text-sm flex flex-col items-center gap-2">
            <AlertCircle size={24} className="text-red-400" />
            Failed to load students. Check your database connection.
          </div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center">
            <UserCircle2 size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">
              {query ? `No students found for "${query}"` : 'No students found'}
            </p>
          </div>
        ) : (
          <>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="hidden sm:table-cell">Student No.</th>
                  <th className="hidden md:table-cell">Program</th>
                  <th className="hidden lg:table-cell">Section</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sti-blue-pale border-2 border-sti-blue/20 flex items-center justify-center shrink-0 text-sti-blue font-bold text-xs">
                          {s.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{s.last_name}, {s.first_name}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{s.student_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell font-mono text-sm text-slate-500">{s.student_number}</td>
                    <td className="hidden md:table-cell text-sm">{s.program}</td>
                    <td className="hidden lg:table-cell text-sm text-slate-500">{s.section}</td>
                    <td className="text-right pr-4">
                      <Link
                        to={`/students/${s.id}`}
                        className="inline-flex items-center gap-1 text-sti-blue hover:text-sti-blue-dark text-sm font-semibold transition-colors"
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  {meta.total.toLocaleString()} students · Page {meta.page} of {meta.pages}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={meta.page <= 1} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">← Prev</button>
                  <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={meta.page >= meta.pages} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}