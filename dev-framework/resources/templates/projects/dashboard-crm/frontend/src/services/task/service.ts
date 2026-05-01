import { fetchWithAuth } from '@/lib/apiClient';
import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TaskFilters,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_PATH = `${API_URL}/api/tasks`;

export const taskKeys = {
  all: ['task'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  overdueCount: () => [...taskKeys.all, 'overdue-count'] as const,
  detail: (id: number) => [...taskKeys.all, 'detail', id] as const,
};

export async function getAllTasks(filters: TaskFilters = {}): Promise<TaskListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.leadId) params.append('lead_id', String(filters.leadId));
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  const qs = params.toString();
  const res = await fetchWithAuth(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function getOverdueCount(): Promise<number> {
  const res = await fetchWithAuth(`${BASE_PATH}/overdue-count`);
  if (!res.ok) throw new Error('Failed to fetch overdue count');
  const data = await res.json();
  return data.count;
}

export async function createTask(data: CreateTaskRequest): Promise<{ id: number }> {
  const res = await fetchWithAuth(BASE_PATH, { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTask(id: number, data: UpdateTaskRequest): Promise<Task> {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
}
