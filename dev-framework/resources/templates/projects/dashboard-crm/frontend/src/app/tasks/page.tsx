'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { CreateEditTaskModal } from '@/components/tasks/CreateEditTaskModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useListTasks } from '@/services/task';
import type { Task, TaskCategory, TaskStatus, TaskPriority } from '@/services/task';

export default function TasksPage() {
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data, isLoading } = useListTasks({
    category: category ?? undefined,
    status: status ?? undefined,
    priority: priority ?? undefined,
    limit: 200,
  });

  const handleFilterChange = (filters: { category: TaskCategory | null; status: TaskStatus | null; priority: TaskPriority | null }) => {
    setCategory(filters.category);
    setStatus(filters.status);
    setPriority(filters.priority);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {data?.total ?? 0} tâche{(data?.total ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TaskFilters
              category={category}
              status={status}
              priority={priority}
              onChange={handleFilterChange}
            />
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle tâche
            </Button>
          </div>
        </div>

        <TaskList
          tasks={data?.tasks ?? []}
          isLoading={isLoading}
          onEdit={handleEdit}
          showLeadLink
        />

        <CreateEditTaskModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          task={editTask}
        />
      </div>
    </ProtectedRoute>
  );
}
