import type {
  Note,
  NoteCreateRequest,
  NoteIdResponse,
  NoteUpdateRequest,
  NoteListResponse,
  NoteMessageResponse,
} from './types';
import { fetchWithAuth } from '@/lib/apiClient';

// ===================================
// CONFIG
// ===================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_PATH = `${API_URL}/api/notes`;

// ===================================
// QUERY KEYS
// ===================================

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  listByLead: (leadId: number) => [...noteKeys.lists(), 'lead', leadId] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: number) => [...noteKeys.details(), id] as const,
};

// ===================================
// SERVICES
// ===================================

/**
 * Create a new note attached to a lead
 * Endpoint: POST /api/notes
 */
export async function createNote(data: NoteCreateRequest): Promise<NoteIdResponse> {
  const response = await fetchWithAuth(`${BASE_PATH}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create note' }));
    throw new Error(error.detail || 'Failed to create note');
  }

  return response.json();
}

/**
 * Get note details by ID
 * Endpoint: GET /api/notes/{id}
 */
export async function getNoteById(id: number): Promise<Note> {
  const response = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Failed to fetch note ${id}` }));
    throw new Error(error.detail || `Failed to fetch note ${id}`);
  }

  return response.json();
}

/**
 * Get all notes for a specific lead (chronological desc)
 * Endpoint: GET /api/leads/{lead_id}/notes
 */
export async function getNotesByLead(leadId: number): Promise<NoteListResponse> {
  const response = await fetchWithAuth(`${API_URL}/api/leads/${leadId}/notes`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Failed to fetch notes for lead ${leadId}` }));
    throw new Error(error.detail || `Failed to fetch notes for lead ${leadId}`);
  }

  return response.json();
}

/**
 * Update note fields by ID (partial update)
 * Endpoint: PUT /api/notes/{id}
 */
export async function updateNote(id: number, data: NoteUpdateRequest): Promise<Note> {
  const response = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Failed to update note ${id}` }));
    throw new Error(error.detail || `Failed to update note ${id}`);
  }

  return response.json();
}

/**
 * Delete note permanently by ID
 * Endpoint: DELETE /api/notes/{id}
 */
export async function deleteNote(id: number): Promise<NoteMessageResponse> {
  const response = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Failed to delete note ${id}` }));
    throw new Error(error.detail || `Failed to delete note ${id}`);
  }

  return response.json();
}
