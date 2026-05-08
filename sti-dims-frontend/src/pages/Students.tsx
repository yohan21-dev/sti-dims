// src/pages/Students.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, User, AlertCircle } from 'lucide-react';
import type { Student } from '@/types';
import { useDebouncedCallback } from '@/hooks/useDebounce';

export default function StudentsPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setQuery(val);
    setPage(1);
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
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Students</h1>
        <p className="text-slate-400 text-sm mt-0.5">Search and view student records from STI Cubao</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={e => {
            setQ(e.target.value);
            debouncedSearch(e.target.value);
          }}
          placeholder="Search by name or student number…"
          className="w-full pl-10 max-w-md"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Searching…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-400 text-sm flex items-center justify-center gap-2">
            <AlertCircle size={16} /> Failed to load students
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {query ? `No students found for "${query}"` : 'No students found'}
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
                        <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center shrink-0">
                          <User size={13} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{s.last_name}, {s.first_name}</p>
                          <p className="text-xs text-slate-500 sm:hidden">{s.student_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell font-mono text-slate-400 text-sm">{s.student_number}</td>
                    <td className="hidden md:table-cell text-slate-300 text-sm">{s.program}</td>
                    <td className="hidden lg:table-cell text-slate-400 text-sm">{s.section}</td>
                    <td className="text-right">
                      <Link
                        to={`/students/${s.id}`}
                        className="inline-flex items-center gap-1 text-gold-400 hover:text-gold-300 text-sm font-medium transition-colors"
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-navy-800">
                <p className="text-xs text-slate-500">
                  {meta.total} students · Page {meta.page} of {meta.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                    disabled={meta.page >= meta.pages}
                    className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}