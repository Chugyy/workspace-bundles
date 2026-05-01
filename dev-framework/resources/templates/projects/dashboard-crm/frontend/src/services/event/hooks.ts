import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllEvents,
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  eventKeys,
} from './service';
import type { CreateEventRequest, UpdateEventRequest, EventFilters } from './types';
import { leadKeys } from '@/services/lead';

export function useListEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => getAllEvents(filters),
  });
}

export function useUpcomingEvents(limit = 10) {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: () => getUpcomingEvents(limit),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventRequest }) => updateEvent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
