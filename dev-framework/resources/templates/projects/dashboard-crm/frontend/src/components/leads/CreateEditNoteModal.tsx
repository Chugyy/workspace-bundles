'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Note } from '@/services/note/types';
import { NoteForm } from './NoteForm';
import { useCreateNote, useUpdateNote } from '@/services/note';
import { toast } from 'sonner';

interface CreateEditNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  leadId: number;
  note?: Note | null;
  onSuccess: () => void;
}

export function CreateEditNoteModal({
  open,
  onOpenChange,
  mode,
  leadId,
  note,
  onSuccess,
}: CreateEditNoteModalProps) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const handleSubmit = (data: any) => {
    if (mode === 'create') {
      createNote.mutate(data, {
        onSuccess: () => {
          toast.success('Note créée avec succès');
          onOpenChange(false);
          onSuccess();
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.detail || 'Erreur lors de la création'
          );
        },
      });
    } else if (mode === 'edit' && note) {
      updateNote.mutate(
        { id: note.id, data },
        {
          onSuccess: () => {
            toast.success('Note modifiée avec succès');
            onOpenChange(false);
            onSuccess();
          },
          onError: (error: any) => {
            toast.error(
              error.response?.data?.detail || 'Erreur lors de la modification'
            );
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Ajouter une note' : 'Modifier la note'}
          </DialogTitle>
          <DialogDescription>
            Documentez vos échanges avec ce lead
          </DialogDescription>
        </DialogHeader>
        <NoteForm
          mode={mode}
          leadId={leadId}
          defaultValues={note}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createNote.isPending || updateNote.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
