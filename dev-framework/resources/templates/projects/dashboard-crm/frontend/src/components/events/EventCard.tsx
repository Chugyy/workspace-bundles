'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Phone, Mail, Users, Share2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useDeleteEvent } from '@/services/event';
import type { Event, EventType } from '@/services/event';
import { toast } from 'sonner';

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  call: { label: 'Téléphone', icon: Phone, color: 'text-blue-500' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-500' },
  meeting: { label: 'Physique', icon: Users, color: 'text-green-500' },
  other: { label: 'Réseaux sociaux', icon: Share2, color: 'text-orange-500' },
  followup: { label: 'Relance', icon: Phone, color: 'text-muted-foreground' },
};

const APPROACH_LABELS: Record<string, string> = {
  first: '1ère approche',
  followup: 'Relance',
};

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
}

export function EventCard({ event, onEdit }: EventCardProps) {
  const deleteEvent = useDeleteEvent();
  const config = CHANNEL_CONFIG[event.eventType] ?? CHANNEL_CONFIG.other;
  const Icon = config.icon;

  const handleDelete = () => {
    deleteEvent.mutate(event.id, {
      onSuccess: () => toast.success('Événement supprimé'),
      onError: () => toast.error('Erreur lors de la suppression'),
    });
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs">{config.label}</Badge>
          {event.approachType && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {APPROACH_LABELS[event.approachType]}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(event.eventDate), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </span>
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{event.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(event)}>
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
              <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
