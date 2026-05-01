'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { Lead, LeadStatus } from '@/services/lead/types';
import { useUpdateLead } from '@/services/lead';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface KanbanViewProps {
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  displayLimit?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const STATUS_CONFIG = [
  { status: LeadStatus.IDENTIFIED, label: 'Identifié' },
  { status: LeadStatus.QUALIFIED, label: 'Qualifié' },
  { status: LeadStatus.CONTACTED, label: 'Contacté' },
  { status: LeadStatus.FOLLOW_UP, label: 'Follow up' },
  { status: LeadStatus.LOST, label: 'Perdu' },
  { status: LeadStatus.CLOSED, label: 'Closé' },
  { status: LeadStatus.ONBOARDED, label: 'Onboardé' },
  { status: LeadStatus.DELIVERED, label: 'Livré' },
  { status: LeadStatus.UPSOLD, label: 'Upsellé' },
];

export function KanbanView({
  leads,
  onCardClick,
  displayLimit,
  onLoadMore,
  hasMore = false
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const updateLeadMutation = useUpdateLead();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getLeadsByStatus = (status: LeadStatus) => {
    const filtered = leads.filter((lead) => lead.status === status);
    return displayLimit ? filtered.slice(0, displayLimit) : filtered;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as number;
    const newStatus = over.id as LeadStatus;

    const lead = leads.find((l) => l.id === leadId);

    if (lead && lead.status !== newStatus) {
      updateLeadMutation.mutate(
        { id: leadId, data: { status: newStatus } },
        {
          onSuccess: () => {
            toast.success('Lead déplacé avec succès');
          },
          onError: () => {
            toast.error('Erreur lors du déplacement du lead');
          },
        }
      );
    }

    setActiveId(null);
  };

  const activeLead = activeId ? leads.find((lead) => lead.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-4">
            {STATUS_CONFIG.map((config) => (
              <KanbanColumn
                key={config.status}
                status={config.status}
                label={config.label}
                leads={getLeadsByStatus(config.status)}
                onCardClick={onCardClick}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {hasMore && onLoadMore && (
          <div className="flex justify-center">
            <Button onClick={onLoadMore} variant="outline">
              Charger +
            </Button>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="opacity-80 rotate-3">
            <KanbanCard lead={activeLead} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
