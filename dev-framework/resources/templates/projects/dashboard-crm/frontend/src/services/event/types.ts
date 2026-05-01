// ===================================
// TYPES - event
// ===================================

export type EventType = 'call' | 'email' | 'meeting' | 'followup' | 'other';
export type ApproachType = 'first' | 'followup';

export interface Event {
  id: number;
  userId: number;
  leadId: number | null;
  title: string;
  description: string | null;
  eventType: EventType;
  approachType: ApproachType | null;
  eventDate: string; // ISO 8601
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  eventType: EventType;
  approachType?: ApproachType;
  eventDate: string;
  description?: string;
  leadId?: number;
  isCompleted?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  eventType?: EventType;
  approachType?: ApproachType | null;
  eventDate?: string;
  leadId?: number | null;
  isCompleted?: boolean;
}

export interface EventListResponse {
  events: Event[];
  total: number;
}

export interface EventFilters {
  leadId?: number;
  eventType?: EventType;
  approachType?: ApproachType;
  isCompleted?: boolean;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
