'use client';

import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from './TaskCard';
import type { Task } from '@/services/task';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function getDiff(task: Task): number | null {
  if (!task.dueDate) return null;
  return differenceInCalendarDays(startOfDay(new Date(task.dueDate)), startOfDay(new Date()));
}

const GROUPS = [
  {
    key: 'overdue',
    label: 'En retard',
    labelColor: 'text-red-600',
    lineColor: 'bg-red-200',
    filter: (t: Task) => t.status !== 'done' && t.dueDate !== null && (getDiff(t) ?? 0) < 0,
  },
  {
    key: 'today',
    label: "Aujourd'hui",
    labelColor: 'text-amber-600',
    lineColor: 'bg-amber-200',
    filter: (t: Task) => t.status !== 'done' && getDiff(t) === 0,
  },
  {
    key: 'tomorrow',
    label: 'Demain',
    labelColor: 'text-yellow-600',
    lineColor: 'bg-yellow-200',
    filter: (t: Task) => t.status !== 'done' && getDiff(t) === 1,
  },
  {
    key: 'week',
    label: 'Dans les 7 jours',
    labelColor: 'text-blue-600',
    lineColor: 'bg-blue-100',
    filter: (t: Task) => t.status !== 'done' && (getDiff(t) ?? -1) >= 2 && (getDiff(t) ?? 0) <= 7,
  },
  {
    key: 'later',
    label: 'Plus tard',
    labelColor: 'text-muted-foreground',
    lineColor: 'bg-border',
    filter: (t: Task) => t.status !== 'done' && (getDiff(t) ?? -1) > 7,
  },
  {
    key: 'no_date',
    label: 'Sans date',
    labelColor: 'text-muted-foreground',
    lineColor: 'bg-border',
    filter: (t: Task) => t.status !== 'done' && t.dueDate === null,
  },
  {
    key: 'done',
    label: 'Terminées',
    labelColor: 'text-muted-foreground',
    lineColor: 'bg-border',
    filter: (t: Task) => t.status === 'done',
  },
];

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (task: Task) => void;
  showLeadLink?: boolean;
}

export function TaskList({ tasks, isLoading, onEdit, showLeadLink = false }: TaskListProps) {
  const [doneExpanded, setDoneExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (tasks.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Aucune tâche trouvée</div>;
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const groupTasks = sortByPriority(tasks.filter(group.filter));
        if (groupTasks.length === 0) return null;

        const isDoneGroup = group.key === 'done';
        const expanded = isDoneGroup ? doneExpanded : true;

        return (
          <div key={group.key} className="space-y-2">
            <div
              className={`flex items-center gap-3 ${isDoneGroup ? 'cursor-pointer select-none' : ''}`}
              onClick={isDoneGroup ? () => setDoneExpanded((v) => !v) : undefined}
            >
              <div className={`h-px flex-1 ${group.lineColor}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${group.labelColor} flex items-center gap-1`}>
                {isDoneGroup && (
                  expanded
                    ? <ChevronDown className="h-3 w-3" />
                    : <ChevronRight className="h-3 w-3" />
                )}
                {group.label}
                <span className="font-normal opacity-60">({groupTasks.length})</span>
              </span>
              <div className={`h-px flex-1 ${group.lineColor}`} />
            </div>

            {expanded && (
              <div className="space-y-2">
                {groupTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={onEdit} showLeadLink={showLeadLink} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
