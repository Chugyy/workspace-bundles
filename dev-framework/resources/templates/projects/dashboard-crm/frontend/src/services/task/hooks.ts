import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllTasks,
  getOverdueCount,
  createTask,
  updateTask,
  deleteTask,
  taskKeys,
} from './service';
import type { CreateTaskRequest, UpdateTaskRequest, TaskFilters } from './types';
import { leadKeys } from '@/services/lead';

export function useListTasks(filters: TaskFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => getAllTasks(filters),
    enabled: options?.enabled,
  });
}

export function useOverdueCount() {
  return useQuery({
    queryKey: taskKeys.overdueCount(),
    queryFn: getOverdueCount,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) => updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
