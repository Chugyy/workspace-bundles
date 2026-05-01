'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/services/lead/types';

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

const HEAT_LEVEL_LABELS: Record<string, string> = {
  cold: 'Froid',
  warm: 'Tiède',
  hot: 'Chaud',
  very_hot: 'Très chaud',
};

const HEAT_LEVEL_COLORS: Record<string, string> = {
  cold: 'bg-gray-100 text-gray-800',
  warm: 'bg-yellow-100 text-yellow-800',
  hot: 'bg-orange-100 text-orange-800',
  very_hot: 'bg-red-100 text-red-800',
};

export function KanbanCard({ lead, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(lead)}
      className="w-full max-w-[260px] bg-card border rounded-lg p-3 flex flex-col gap-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
    >
      <p className="text-sm font-semibold text-foreground line-clamp-1">
        {lead.name} {lead.firstName || ''}
      </p>

      {lead.email && (
        <p className="text-xs text-muted-foreground line-clamp-1">{lead.email}</p>
      )}

      {lead.company && (
        <p className="text-xs text-muted-foreground line-clamp-1">{lead.company}</p>
      )}

      <div className="pt-0.5">
        <Badge
          className={`${HEAT_LEVEL_COLORS[lead.heatLevel]} text-xs px-1.5 py-0.5`}
          variant="secondary"
        >
          {HEAT_LEVEL_LABELS[lead.heatLevel] || lead.heatLevel}
        </Badge>
      </div>
    </div>
  );
}
