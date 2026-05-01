import { fetchWithAuth } from '@/lib/apiClient';
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  EventListResponse,
  EventFilters,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_PATH = `${API_URL}/api/events`;

export const eventKeys = {
  all: ['event'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), { filters }] as const,
  upcoming: () => [...eventKeys.all, 'upcoming'] as const,
  detail: (id: number) => [...eventKeys.all, 'detail', id] as const,
};

export async function getUpcomingEvents(limit = 10): Promise<EventListResponse> {
  const res = await fetchWithAuth(`${BASE_PATH}/upcoming?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch upcoming events');
  return res.json();
}

export async function getAllEvents(filters: EventFilters = {}): Promise<EventListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.leadId) params.append('leadId', String(filters.leadId));
  if (filters.eventType) params.append('eventType', filters.eventType);
  if (filters.approachType) params.append('approachType', filters.approachType);
  if (filters.order) params.append('order', filters.order);
  if (filters.isCompleted !== undefined) params.append('isCompleted', String(filters.isCompleted));
  const qs = params.toString();
  const res = await fetchWithAuth(qs ? `${BASE_PATH}?${qs}` : BASE_PATH);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(data: CreateEventRequest): Promise<{ id: number }> {
  const res = await fetchWithAuth(BASE_PATH, { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function updateEvent(id: number, data: UpdateEventRequest): Promise<Event> {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function deleteEvent(id: number): Promise<void> {
  const res = await fetchWithAuth(`${BASE_PATH}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete event');
}
