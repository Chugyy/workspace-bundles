'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/services/lead/types';
import { Note } from '@/services/note/types';
import { NoteCard } from './NoteCard';
import { CreateEditNoteModal } from './CreateEditNoteModal';
import { useGetLead, useDeleteLead } from '@/services/lead';
import { useNotesByLead, useDeleteNote } from '@/services/note';
import { useListTasks } from '@/services/task';
import type { Task } from '@/services/task';
import { TaskCard } from '@/components/tasks/TaskCard';
import { CreateEditTaskModal } from '@/components/tasks/CreateEditTaskModal';
import { useListEvents } from '@/services/event';
import type { Event as CrmEvent } from '@/services/event';
import { EventCard } from '@/components/events/EventCard';
import { CreateEditEventModal } from '@/components/events/CreateEditEventModal';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Pencil,
  Trash2,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number | null;
  onEdit: (lead: Lead) => void;
  onDeleteSuccess: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  identified: 'Identifié',
  qualified: 'Qualifié',
  contacted: 'Contacté',
  follow_up: 'Follow up',
  lost: 'Perdu',
  closed: 'Closé',
  onboarded: 'Onboardé',
  delivered: 'Livré',
  upsold: 'Upsellé',
};

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

export function LeadDetailSheet({
  open,
  onOpenChange,
  leadId,
  onEdit,
  onDeleteSuccess,
}: LeadDetailSheetProps) {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [deleteLeadAlertOpen, setDeleteLeadAlertOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CrmEvent | null>(null);

  const { data: lead, isLoading: leadLoading } = useGetLead(leadId || 0, {
    enabled: !!leadId && open,
  });

  const {
    data: notesData,
    isLoading: notesLoading,
    refetch: refetchNotes,
  } = useNotesByLead(leadId || 0);

  const { data: tasksData } = useListTasks(
    { leadId: leadId || undefined, limit: 50 },
    { enabled: !!leadId && open }
  );

  const { data: eventsData } = useListEvents(
    { leadId: leadId || undefined, limit: 50, order: 'desc' },
  );

  const deleteLead = useDeleteLead();
  const deleteNote = useDeleteNote();

  const handleAddNote = () => {
    setNoteModalMode('create');
    setSelectedNote(null);
    setNoteModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setNoteModalMode('edit');
    setSelectedNote(note);
    setNoteModalOpen(true);
  };

  const handleDeleteNote = (noteId: number) => {
    setDeleteNoteId(noteId);
    setDeleteAlertOpen(true);
  };

  const confirmDeleteNote = () => {
    if (deleteNoteId && leadId) {
      deleteNote.mutate(
        { id: deleteNoteId, leadId },
        {
          onSuccess: () => {
            toast.success('Note supprimée avec succès');
            refetchNotes();
            setDeleteAlertOpen(false);
            setDeleteNoteId(null);
          },
          onError: () => {
            toast.error('Erreur lors de la suppression');
            setDeleteAlertOpen(false);
            setDeleteNoteId(null);
          },
        }
      );
    }
  };

  const handleDeleteLead = () => {
    setDeleteLeadAlertOpen(true);
  };

  const confirmDeleteLead = () => {
    if (lead) {
      deleteLead.mutate(lead.id, {
        onSuccess: () => {
          toast.success('Lead supprimé avec succès');
          setDeleteLeadAlertOpen(false);
          onOpenChange(false);
          onDeleteSuccess();
        },
        onError: () => {
          toast.error('Erreur lors de la suppression');
          setDeleteLeadAlertOpen(false);
        },
      });
    }
  };

  if (!open || !leadId) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-l overflow-y-auto p-4">
          {leadLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : lead ? (
            <>
              <SheetHeader className="px-1">
                <SheetTitle>
                  {lead.name} {lead.firstName || ''}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                <div className="space-y-6 pr-2">
                  {/* Contact Info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Informations de contact</h3>

                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>

                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.phone}</span>
                      </div>
                    )}

                    {lead.company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.company}</span>
                      </div>
                    )}

                    {lead.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{lead.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Business Info */}
                  {(lead.ca != null || lead.effectifs) && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Infos business</h3>
                      {lead.ca != null && (
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>CA : {lead.ca.toLocaleString('fr-FR')} €</span>
                        </div>
                      )}
                      {lead.effectifs && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Effectifs : {lead.effectifs}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Links */}
                  {(lead.instagram ||
                    lead.linkedin ||
                    lead.twitter ||
                    lead.youtube ||
                    lead.website) && (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Réseaux sociaux</h3>
                        {lead.instagram && (
                          <a
                            href={lead.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <Instagram className="h-4 w-4 text-muted-foreground" />
                            <span>Instagram</span>
                          </a>
                        )}
                        {lead.linkedin && (
                          <a
                            href={lead.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <Linkedin className="h-4 w-4 text-muted-foreground" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {lead.twitter && (
                          <a
                            href={lead.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <Twitter className="h-4 w-4 text-muted-foreground" />
                            <span>Twitter</span>
                          </a>
                        )}
                        {lead.youtube && (
                          <a
                            href={lead.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <Youtube className="h-4 w-4 text-muted-foreground" />
                            <span>YouTube</span>
                          </a>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>Site web</span>
                          </a>
                        )}
                      </div>
                    </>
                  )}

                  {/* Status Info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Statut</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                      <Badge
                        className={HEAT_LEVEL_COLORS[lead.heatLevel]}
                        variant="secondary"
                      >
                        {HEAT_LEVEL_LABELS[lead.heatLevel] || lead.heatLevel}
                      </Badge>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Notes</h3>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>

                    {notesLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-24 bg-muted rounded" />
                        <div className="h-24 bg-muted rounded" />
                      </div>
                    ) : notesData?.notes && notesData.notes.length > 0 ? (
                      <div className="space-y-3">
                        {notesData.notes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onEdit={handleEditNote}
                            onDelete={handleDeleteNote}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Aucune note pour ce lead
                      </div>
                    )}
                  </div>

                  {/* Tasks Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Tâches</h3>
                      <Button
                        size="sm"
                        onClick={() => { setEditTask(null); setTaskModalOpen(true); }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>

                    {tasksData?.tasks && tasksData.tasks.length > 0 ? (
                      <div className="space-y-2">
                        {tasksData.tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={(t) => { setEditTask(t); setTaskModalOpen(true); }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        Aucune tâche pour ce lead
                      </div>
                    )}
                  </div>

                  {/* Events Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Événements</h3>
                      <Button
                        size="sm"
                        onClick={() => { setEditEvent(null); setEventModalOpen(true); }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>

                    {eventsData?.events && eventsData.events.length > 0 ? (
                      <div className="space-y-2">
                        {eventsData.events.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onEdit={(e) => { setEditEvent(e); setEventModalOpen(true); }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        Aucun événement pour ce lead
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => onEdit(lead)}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteLead}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Lead introuvable
            </div>
          )}
        </SheetContent>
      </Sheet>

      {leadId && (
        <CreateEditNoteModal
          open={noteModalOpen}
          onOpenChange={setNoteModalOpen}
          mode={noteModalMode}
          leadId={leadId}
          note={selectedNote}
          onSuccess={refetchNotes}
        />
      )}

      {leadId && lead && (
        <CreateEditTaskModal
          open={taskModalOpen}
          onOpenChange={setTaskModalOpen}
          task={editTask}
          defaultLeadId={editTask ? undefined : leadId}
          defaultLeadName={editTask ? undefined : [lead.firstName, lead.name].filter(Boolean).join(' ')}
        />
      )}

      {leadId && lead && (
        <CreateEditEventModal
          open={eventModalOpen}
          onOpenChange={setEventModalOpen}
          event={editEvent}
          defaultLeadId={editEvent ? undefined : leadId}
          defaultLeadName={editEvent ? undefined : [lead.firstName, lead.name].filter(Boolean).join(' ')}
        />
      )}

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette note ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNote}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteLeadAlertOpen} onOpenChange={setDeleteLeadAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce lead ? Cette action supprimera également toutes les notes associées et est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLead}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
