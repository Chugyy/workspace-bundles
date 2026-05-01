// ===================================
// TYPES - lead
// ===================================

/**
 * Lead Status Enum
 * Source: GET /api/leads/{id} output (status field)
 */
export enum LeadStatus {
  IDENTIFIED = 'identified',
  QUALIFIED = 'qualified',
  CONTACTED = 'contacted',
  FOLLOW_UP = 'follow_up',
  LOST = 'lost',
  CLOSED = 'closed',
  ONBOARDED = 'onboarded',
  DELIVERED = 'delivered',
  UPSOLD = 'upsold',
}

/**
 * Lead Heat Level Enum
 * Source: GET /api/leads/{id} output (heat_level field)
 */
export enum HeatLevel {
  COLD = 'cold',
  WARM = 'warm',
  HOT = 'hot',
  VERY_HOT = 'very_hot',
}

/**
 * Modèle principal Lead
 * Source: GET /api/leads/{id} output
 */
export interface Lead {
  id: number;
  userId: number;
  name: string;
  firstName: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  youtube: string | null;
  website: string | null;
  status: LeadStatus;
  heatLevel: HeatLevel;
  city?: string | null;
  ca?: number | null;
  effectifs?: string | null;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  lastActivityAt: string; // ISO 8601 format — updated on notes/tasks/events changes
}

/**
 * Request - Créer Lead
 * Source: POST /api/leads input
 */
export interface CreateLeadRequest {
  name: string; // Required
  firstName?: string;
  email: string; // Required
  phone?: string;
  company?: string;
  address?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
  status?: LeadStatus;
  heatLevel?: HeatLevel;
  ca?: number | null;
  effectifs?: string | null;
}

/**
 * Response - Lead créé
 * Source: POST /api/leads output
 */
export interface LeadResponse {
  id: number;
}

/**
 * Request - Mise à jour Lead
 * Source: PUT /api/leads/{id} input
 */
export interface UpdateLeadRequest {
  name?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
  status?: LeadStatus;
  heatLevel?: HeatLevel;
  ca?: number | null;
  effectifs?: string | null;
}

/**
 * Pagination metadata
 * Source: GET /api/leads output (pagination field)
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Liste paginée de leads
 * Source: GET /api/leads output
 */
export interface LeadListResponse {
  leads: Lead[];
  pagination: PaginationInfo;
}

/**
 * Filters for GET /api/leads
 */
export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  heatLevel?: HeatLevel;
  city?: string;
  search?: string;
  sortBy?: 'last_activity_at' | 'updated_at' | 'created_at' | 'name';
  order?: 'asc' | 'desc';
}
