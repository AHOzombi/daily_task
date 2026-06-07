import type { PublicUser } from '../types/user';
import { API_BASE } from './task-api';

export interface LoginResult {
  token: string;
  user: PublicUser;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });
  const payload = await response.json() as { code?: number; message?: string; data: T };
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

export const authApi = {
  login(username: string, password: string) {
    return request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  register(username: string, password: string) {
    return request<LoginResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  me() {
    const token = localStorage.getItem('task_token');
    if (!token) return Promise.reject(new Error('No token'));
    return request<{ userId: string; username: string }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  checkUsername(username: string) {
    return request<{ available: boolean }>(`/auth/check-username?username=${encodeURIComponent(username)}`);
  }
};
