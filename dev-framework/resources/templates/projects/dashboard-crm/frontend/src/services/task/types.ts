// ===================================
// TYPES - task
// ===================================

export type TaskCategory = 'commercial' | 'delivery';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  userId: number;
  leadId: number | null;
  leadName: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  category: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
  description?: string;
  leadId?: number;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  category?: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  leadId?: number | null;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
}

export interface TaskFilters {
  leadId?: number;
  category?: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
}
