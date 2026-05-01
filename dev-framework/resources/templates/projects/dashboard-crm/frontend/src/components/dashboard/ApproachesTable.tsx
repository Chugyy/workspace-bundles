'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Phone, Mail, Users, Share2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useListEvents, useDeleteEvent } from '@/services/event';
import type { Event } from '@/services/event';
import { CreateEditEventModal } from '@/components/events/CreateEditEventModal';
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

export function ApproachesTable() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);

  const { data, isLoading } = useListEvents({ limit: 100, order: 'desc' });
  const deleteEvent = useDeleteEvent();

  const events = data?.events ?? [];

  const handleEdit = (event: Event) => {
    setEditEvent(event);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Approches commerciales</CardTitle>
            <Button size="sm" onClick={handleCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune approche enregistrée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left pb-2 pr-4 font-medium">Type</th>
                    <th className="text-left pb-2 pr-4 font-medium">Canal</th>
                    <th className="text-left pb-2 pr-4 font-medium">Date</th>
                    <th className="text-left pb-2 pr-4 font-medium">Lead</th>
                    <th className="text-left pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const config = CHANNEL_CONFIG[event.eventType] ?? CHANNEL_CONFIG.other;
                    const Icon = config.icon;
                    return (
                      <tr key={event.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors group">
                        <td className="py-2.5 pr-4">
                          {event.approachType ? (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {APPROACH_LABELS[event.approachType]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
                            <span>{config.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                          {format(new Date(event.eventDate), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </td>
                        <td className="py-2.5 pr-4">
                          {event.leadId ? (
                            <button
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={() => router.push(`/leads?leadId=${event.leadId}`)}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="text-xs truncate max-w-[100px]">Voir lead</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 max-w-[200px]">
                          <p className="truncate text-muted-foreground">{event.description ?? '—'}</p>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(event)}>
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
                                  <AlertDialogAction
                                    onClick={() => deleteEvent.mutate(event.id, {
                                      onSuccess: () => toast.success('Événement supprimé'),
                                      onError: () => toast.error('Erreur lors de la suppression'),
                                    })}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEditEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={editEvent}
      />
    </>
  );
}
