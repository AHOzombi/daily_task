import type { CreateTaskInput, TaskFilters, TaskPageResult, TaskRecord, UpdateTaskInput } from '../types/task';

function resolveApiBase() {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:10124/api';
  }

  return '/api';
}

export const API_BASE = resolveApiBase();
export const ACTIVITY_API = `${API_BASE}/activities`;

function buildQuery(filters: TaskFilters) {
  const search = new URLSearchParams();
  if (filters.keyword) search.set('keyword', filters.keyword);
  if (filters.status) search.set('status', filters.status);
  if (filters.priority) search.set('priority', filters.priority);
  search.set('page', String(filters.page));
  search.set('pageSize', String(filters.pageSize));
  return search.toString();
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('task_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders()
  };
  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });
  const payload = await response.json() as { code?: number; message?: string; data: T };
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

export const taskApi = {
  list(filters: TaskFilters) {
    return request<TaskPageResult>(`/tasks?${buildQuery(filters)}`);
  },

  getAll() {
    return request<TaskRecord[]>('/tasks/all');
  },

  create(input: CreateTaskInput) {
    return request<TaskRecord>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  update(input: UpdateTaskInput) {
    return request<TaskRecord>(`/tasks/${input.id}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  },

  remove(id: string) {
    return request<null>(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  updateStatus(id: string, status: TaskRecord['status']) {
    return request<TaskRecord>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  updateSubtask(taskId: string, subtaskId: string, done: boolean) {
    return request<TaskRecord>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ done })
    });
  }
};
