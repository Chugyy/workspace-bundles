'use client';

import { differenceInCalendarDays, startOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Tag, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUpdateTask, useDeleteTask } from '@/services/task';
import type { Task } from '@/services/task';
import { toast } from 'sonner';

const PRIORITY_CONFIG = {
  high: { label: 'Haute', className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: 'Moyenne', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  low: { label: 'Basse', className: 'bg-green-100 text-green-700 border-green-200' },
};

const CATEGORY_CONFIG = {
  commercial: { label: 'Commercial', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  delivery: { label: 'Delivery', className: 'bg-violet-100 text-violet-700 border-violet-200' },
};

function getUrgencyStyle(task: Task): { border: string; bg: string } {
  if (task.status === 'done') return { border: 'border-l-border', bg: '' };
  if (!task.dueDate) return { border: 'border-l-border', bg: '' };

  const diff = differenceInCalendarDays(
    startOfDay(new Date(task.dueDate)),
    startOfDay(new Date())
  );

  if (diff <= -2) return { border: 'border-l-red-600', bg: 'bg-red-50 dark:bg-red-950/10' };
  if (diff === -1) return { border: 'border-l-red-400', bg: 'bg-red-50 dark:bg-red-950/10' };
  if (diff === 0) return { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/10' };
  if (diff === 1) return { border: 'border-l-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/10' };
  return { border: 'border-l-border', bg: '' };
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  showLeadLink?: boolean;
}

export function TaskCard({ task, onEdit, showLeadLink = false }: TaskCardProps) {
  const router = useRouter();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { border, bg } = getUrgencyStyle(task);
  const isDone = task.status === 'done';

  const toggleDone = () => {
    updateTask.mutate(
      { id: task.id, data: { status: isDone ? 'todo' : 'done' } },
      { onError: () => toast.error('Erreur lors de la mise à jour') }
    );
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate(id, {
      onSuccess: () => toast.success('Tâche supprimée'),
      onError: () => toast.error('Erreur lors de la suppression'),
    });
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border border-l-4 ${border} ${bg} bg-card ${isDone ? 'opacity-60' : ''} transition-colors`}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={toggleDone}
        className="mt-0.5 shrink-0"
        disabled={updateTask.isPending}
      />

      <div className="flex-1 min-w-0 space-y-1.5">
        <p className={`text-sm font-medium line-clamp-2 [overflow-wrap:anywhere] ${isDone ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 [overflow-wrap:anywhere]">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`text-xs ${CATEGORY_CONFIG[task.category].className}`}>
            {CATEGORY_CONFIG[task.category].label}
          </Badge>
          <Badge variant="outline" className={`text-xs ${PRIORITY_CONFIG[task.priority].className}`}>
            {PRIORITY_CONFIG[task.priority].label}
          </Badge>
          {task.leadName && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
              <Tag className="h-2.5 w-2.5" />
              {task.leadName}
            </Badge>
          )}
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.dueDate), 'dd MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {showLeadLink && task.leadId && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => router.push(`/leads?leadId=${task.leadId}`)}
            title={task.leadName ?? 'Voir le lead'}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(task)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la tâche ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(task.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
