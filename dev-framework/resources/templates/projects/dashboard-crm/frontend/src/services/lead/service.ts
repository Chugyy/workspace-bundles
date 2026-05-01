import { fetchWithAuth } from '@/lib/apiClient';
import type {
  Lead,
  CreateLeadRequest,
  LeadResponse,
  UpdateLeadRequest,
  LeadListResponse,
  LeadFilters,
} from './types';

// ===================================
// CONFIG
// ===================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_PATH = `${API_URL}/api/leads`;

// ===================================
// QUERY KEYS
// ===================================

export const leadKeys = {
  all: ['lead'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), { filters }] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: number) => [...leadKeys.details(), id] as const,
};

// ===================================
// SERVICES
// ===================================

/**
 * Récupérer tous les leads avec filtres et pagination
 * Endpoint: GET /api/leads
 */
export async function getAllLeads(filters: LeadFilters = {}): Promise<LeadListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.status) params.append('status', filters.status);
  if (filters.heatLevel) params.append('heatLevel', filters.heatLevel);
  if (filters.city) params.append('city', filters.city);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.order) params.append('order', filters.order);

  const queryString = params.toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

  const response = await fetchWithAuth(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch leads' }));
    throw new Error(errorData.detail || 'Failed to fetch leads');
  }

  return response.json();
}

/**
 * Récupérer un lead par ID
 * Endpoint: GET /api/leads/{id}
 */
export async function getLeadById(id: number): Promise<Lead> {
  const response = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `Failed to fetch lead ${id}` }));
    throw new Error(errorData.detail || `Failed to fetch lead ${id}`);
  }

  return response.json();
}

/**
 * Créer un nouveau lead
 * Endpoint: POST /api/leads
 */
export async function createLead(data: CreateLeadRequest): Promise<LeadResponse> {
  const response = await fetchWithAuth(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to create lead' }));
    throw new Error(errorData.detail || 'Failed to create lead');
  }

  return response.json();
}

/**
 * Mettre à jour un lead
 * Endpoint: PUT /api/leads/{id}
 */
export async function updateLead(id: number, data: UpdateLeadRequest): Promise<Lead> {
  const response = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `Failed to update lead ${id}` }));
    throw new Error(errorData.detail || `Failed to update lead ${id}`);
  }

  return response.json();
}

/**
 * Supprimer un lead
 * Endpoint: DELETE /api/leads/{id}
 */
export async function deleteLead(id: number): Promise<void> {
  const response = await fetchWithAuth(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `Failed to delete lead ${id}` }));
    throw new Error(errorData.detail || `Failed to delete lead ${id}`);
  }
}
