import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  leadKeys,
} from './service';
import type {
  Lead,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadResponse,
  LeadListResponse,
  LeadFilters,
} from './types';

// ===================================
// QUERY HOOKS (GET)
// ===================================

/**
 * Hook - Récupérer tous les leads avec filtres et pagination
 * Endpoint: GET /api/leads
 */
export function useListLeads(
  filters: LeadFilters = {},
  options?: { enabled?: boolean }
): UseQueryResult<LeadListResponse, Error> {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => getAllLeads(filters),
    enabled: options?.enabled,
  });
}

/**
 * Hook - Récupérer un lead par ID
 * Endpoint: GET /api/leads/{id}
 */
export function useGetLead(
  id: number,
  options?: { enabled?: boolean }
): UseQueryResult<Lead, Error> {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => getLeadById(id),
    enabled: options?.enabled !== false && !!id, // Ne lance la requête que si ID existe
  });
}

// ===================================
// MUTATION HOOKS (POST, PUT, DELETE)
// ===================================

/**
 * Hook - Créer un lead
 * Endpoint: POST /api/leads
 */
export function useCreateLead(): UseMutationResult<
  LeadResponse,
  Error,
  CreateLeadRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      // Invalider cache pour rafraîchir liste
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Hook - Mettre à jour un lead
 * Endpoint: PUT /api/leads/{id}
 */
export function useUpdateLead(): UseMutationResult<
  Lead,
  Error,
  { id: number; data: UpdateLeadRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateLead(id, data),
    onSuccess: (updatedLead, variables) => {
      // Invalider cache pour l'item mis à jour
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });

      // Optimistic update: mettre à jour le cache directement
      queryClient.setQueryData(leadKeys.detail(variables.id), updatedLead);
    },
  });
}

/**
 * Hook - Supprimer un lead
 * Endpoint: DELETE /api/leads/{id}
 */
export function useDeleteLead(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLead,
    onSuccess: (_, leadId) => {
      // Invalider cache après suppression
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      // Supprimer le lead du cache detail
      queryClient.removeQueries({ queryKey: leadKeys.detail(leadId) });
    },
  });
}

/**
 * Hook - Rechercher des leads
 * Alias pour useListLeads avec filtre search
 * Endpoint: GET /api/leads?search={query}
 */
export function useSearchLeads(
  searchQuery: string,
  filters: Omit<LeadFilters, 'search'> = {},
  options?: { enabled?: boolean }
): UseQueryResult<LeadListResponse, Error> {
  return useListLeads(
    { ...filters, search: searchQuery },
    { enabled: options?.enabled !== false && searchQuery.length > 0 }
  );
}
