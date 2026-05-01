'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import type { TaskCategory, TaskStatus, TaskPriority } from '@/services/task';

interface TaskFiltersProps {
  category: TaskCategory | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  onChange: (filters: { category: TaskCategory | null; status: TaskStatus | null; priority: TaskPriority | null }) => void;
}

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'delivery', label: 'Delivery' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Haute' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'low', label: 'Basse' },
];

export function TaskFilters({ category, status, priority, onChange }: TaskFiltersProps) {
  const activeCount = [category, status, priority].filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtres
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Catégorie</DropdownMenuLabel>
        {CATEGORIES.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.value}
            checked={category === c.value}
            onCheckedChange={() => onChange({ category: category === c.value ? null : c.value, status, priority })}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Statut</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuCheckboxItem
            key={s.value}
            checked={status === s.value}
            onCheckedChange={() => onChange({ category, status: status === s.value ? null : s.value, priority })}
          >
            {s.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Priorité</DropdownMenuLabel>
        {PRIORITIES.map((p) => (
          <DropdownMenuCheckboxItem
            key={p.value}
            checked={priority === p.value}
            onCheckedChange={() => onChange({ category, status, priority: priority === p.value ? null : p.value })}
          >
            {p.label}
          </DropdownMenuCheckboxItem>
        ))}

        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onChange({ category: null, status: null, priority: null })}>
              Réinitialiser
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
