'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lead } from '@/services/lead/types';
import { LeadForm } from './LeadForm';
import { useCreateLead, useUpdateLead } from '@/services/lead';
import { toast } from 'sonner';

interface CreateEditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  lead?: Lead | null;
  onSuccess: () => void;
}

export function CreateEditLeadModal({
  open,
  onOpenChange,
  mode,
  lead,
  onSuccess,
}: CreateEditLeadModalProps) {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const handleSubmit = (data: any) => {
    if (mode === 'create') {
      createLead.mutate(data, {
        onSuccess: () => {
          toast.success('Lead créé avec succès');
          onOpenChange(false);
          onSuccess();
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.detail || 'Erreur lors de la création'
          );
        },
      });
    } else if (mode === 'edit' && lead) {
      updateLead.mutate(
        { id: lead.id, data },
        {
          onSuccess: () => {
            toast.success('Lead modifié avec succès');
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
      <DialogContent className="max-w-2xl max-h-[65vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {mode === 'create' ? 'Créer un lead' : 'Modifier le lead'}
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations du lead
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <LeadForm
            mode={mode}
            defaultValues={lead}
            onSubmit={handleSubmit}
            isSubmitting={createLead.isPending || updateLead.isPending}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="lead-form"
            disabled={createLead.isPending || updateLead.isPending}
          >
            {createLead.isPending || updateLead.isPending
              ? 'Enregistrement...'
              : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
