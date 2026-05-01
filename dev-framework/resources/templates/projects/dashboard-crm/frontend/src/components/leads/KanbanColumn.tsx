'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/services/lead/types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: string;
  label: string;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

export function KanbanColumn({
  status,
  label,
  leads,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const leadIds = leads.map((lead) => lead.id);

  return (
    <div
      className={`flex flex-col bg-muted/30 rounded-lg p-4 min-w-[280px] h-[calc(100vh-220px)] transition-colors ${
        isOver ? 'bg-muted/50 ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-1">
          {leads.length}
        </span>
      </div>
      <ScrollArea className="flex-1 h-0">
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="pr-4 space-y-3 min-h-full">
            {leads.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Aucun lead
              </div>
            ) : (
              leads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onClick={onCardClick}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
