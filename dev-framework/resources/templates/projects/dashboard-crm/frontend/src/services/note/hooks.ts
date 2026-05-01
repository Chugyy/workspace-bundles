import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  createNote,
  getNoteById,
  getNotesByLead,
  updateNote,
  deleteNote,
  noteKeys,
} from './service';
import { leadKeys } from '@/services/lead';
import type {
  Note,
  NoteCreateRequest,
  NoteIdResponse,
  NoteUpdateRequest,
  NoteListResponse,
  NoteMessageResponse,
} from './types';

// ===================================
// QUERY HOOKS (GET)
// ===================================

/**
 * Hook - Get note details by ID
 * Endpoint: GET /api/notes/{id}
 */
export function useNote(id: number): UseQueryResult<Note, Error> {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => getNoteById(id),
    enabled: !!id && id > 0,
  });
}

/**
 * Hook - Get all notes for a specific lead
 * Endpoint: GET /api/leads/{lead_id}/notes
 */
export function useNotesByLead(leadId: number): UseQueryResult<NoteListResponse, Error> {
  return useQuery({
    queryKey: noteKeys.listByLead(leadId),
    queryFn: () => getNotesByLead(leadId),
    enabled: !!leadId && leadId > 0,
  });
}

// ===================================
// MUTATION HOOKS (POST, PUT, DELETE)
// ===================================

/**
 * Hook - Create a new note
 * Endpoint: POST /api/notes
 */
export function useCreateNote(): UseMutationResult<
  NoteIdResponse,
  Error,
  NoteCreateRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.listByLead(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook - Update a note
 * Endpoint: PUT /api/notes/{id}
 */
export function useUpdateNote(): UseMutationResult<
  Note,
  Error,
  { id: number; data: NoteUpdateRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateNote(id, data),
    onSuccess: (updatedNote, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.listByLead(updatedNote.leadId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook - Delete a note
 * Endpoint: DELETE /api/notes/{id}
 */
export function useDeleteNote(): UseMutationResult<
  NoteMessageResponse,
  Error,
  { id: number; leadId: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => deleteNote(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.listByLead(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
