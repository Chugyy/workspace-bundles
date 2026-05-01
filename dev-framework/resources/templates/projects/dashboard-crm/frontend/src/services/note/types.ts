// ===================================
// TYPES - note
// ===================================

export interface Note {
  id: number;
  leadId: number;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreateRequest {
  leadId: number;
  title: string;
  content?: string | null;
}

export interface NoteIdResponse {
  id: number;
}

export interface NoteUpdateRequest {
  title?: string;
  content?: string | null;
}

export interface NoteListResponse {
  notes: Note[];
}

export interface NoteMessageResponse {
  message: string;
}
