// src/lib/api.ts
import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── CSRF: read csrf_token cookie and attach as header ──────────
function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find(r => r.startsWith('csrf_token='))
    ?.split('=')[1] ?? '';
}

api.interceptors.request.use(config => {
  const method = (config.method ?? '').toUpperCase();

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.headers['X-CSRF-Token'] = getCsrfToken();
  }

  return config;
});

// ── Auto-refresh on 401 ────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;

    const isAuthCheck = original.url?.includes('/auth/me.php');
    const isRefreshRequest = original.url?.includes('/auth/refresh.php');
    const isLoginPage = window.location.pathname.includes('/login');

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthCheck &&
      !isRefreshRequest
    ) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise<boolean>(resolve => {
          refreshQueue.push(resolve);
        }).then(ok => (ok ? api(original) : Promise.reject(error)));
      }

      isRefreshing = true;

      try {
        await axios.post(`${BASE}/auth/refresh.php`, {}, { withCredentials: true });

        refreshQueue.forEach(cb => cb(true));
        refreshQueue = [];

        return api(original);
      } catch {
        refreshQueue.forEach(cb => cb(false));
        refreshQueue = [];

        if (!isLoginPage) {
          window.location.href = '/login';
        }

        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login.php', { username, password }),

  logout: () =>
    api.post('/auth/logout.php'),

  me: () =>
    api.get('/auth/me.php'),
};

// ── Students ───────────────────────────────────────────────────
export const studentsApi = {
  search: (q: string, page = 1) =>
    api.get('/students/index.php', { params: { q, page } }),

  get: (id: number) =>
    api.get('/students/index.php', { params: { id } }),
};

// ── Violations ─────────────────────────────────────────────────
export const violationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/violations/index.php', { params }),

  get: (id: number) =>
    api.get('/violations/index.php', { params: { id } }),

  byStudent: (studentId: number) =>
    api.get('/violations/index.php', { params: { student_id: studentId } }),

  create: (data: Record<string, unknown>) =>
    api.post('/violations/index.php', data),

  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/violations/index.php?id=${id}`, data),

  delete: (id: number) =>
    api.delete(`/violations/index.php?id=${id}`),
};

// ── Violation Types ────────────────────────────────────────────
export const violationTypesApi = {
  list: () =>
    api.get('/violation_types/index.php'),
};

// ── Deployments ────────────────────────────────────────────────
// Use this name because your page is Deployments.tsx
export const deploymentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/deployment/index.php', { params }),

  get: (id: number) =>
    api.get('/deployment/index.php', { params: { id } }),

  byStudent: (studentId: number) =>
    api.get('/deployment/index.php', { params: { student_id: studentId } }),

  create: (data: Record<string, unknown>) =>
    api.post('/deployment/index.php', data),

  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/deployment/index.php?id=${id}`, data),

  logHours: (data: Record<string, unknown>) =>
    api.put('/deployment/index.php', data),
};

// Optional alias if some old files still import deploymentApi
export const deploymentApi = deploymentsApi;

// ── Dashboard ──────────────────────────────────────────────────
export const dashboardApi = {
  stats: () =>
    api.get('/dashboard/index.php'),
};

// ── Files ──────────────────────────────────────────────────────
export const filesApi = {
  upload: async (formData: FormData) => {
    try {
      return await axios.post(`${BASE}/files/upload.php`, formData, {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });
    } catch (error: any) {
      console.error('Upload failed:', error.response?.data ?? error);
      throw error;
    }
  },
};