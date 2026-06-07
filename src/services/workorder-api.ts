import type { CreateWorkOrderInput, WorkOrder, WorkOrderFilters } from '../types/workorder';

function resolveApiBase() {
  if (typeof window === 'undefined') return 'http://127.0.0.1:10124/api';
  return '/api';
}

const API_BASE = resolveApiBase();

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('task_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
  };
  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  const payload = await response.json() as { code?: number; message?: string; data: T };
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

export const workorderApi = {
  list(filters: WorkOrderFilters) {
    const params = new URLSearchParams();
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 20));
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.keyword) params.set('keyword', filters.keyword);
    return request<{ list: WorkOrder[]; total: number }>(`/workorders?${params}`);
  },

  create(input: CreateWorkOrderInput) {
    return request<WorkOrder>('/workorders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: Partial<CreateWorkOrderInput>) {
    return request<WorkOrder>(`/workorders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  delete(id: string) {
    return request<null>(`/workorders/${id}`, { method: 'DELETE' });
  },

  getTodayCount() {
    return request<{ count: number }>('/workorders/today-count');
  },

  exportUrl(dateFrom: string, dateTo: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return `${API_BASE}/workorders/export?${params.toString()}`;
  },

  importOrders(orders: CreateWorkOrderInput[]) {
    return request<{ imported: number; skipped: number }>('/workorders/import', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    });
  },

  downloadTemplate() {
    window.open('/工单导入模板.xlsx', '_blank');
  },
};
