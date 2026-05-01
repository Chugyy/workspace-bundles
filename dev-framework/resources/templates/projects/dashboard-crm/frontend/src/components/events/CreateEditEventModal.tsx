'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useCreateEvent, useUpdateEvent } from '@/services/event';
import type { Event, EventType } from '@/services/event';
import { useListLeads } from '@/services/lead';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Canal labels — followup excluded from approach channels
const CHANNEL_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'call', label: 'Téléphone' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Physique' },
  { value: 'other', label: 'Réseaux sociaux' },
];

function generateTitle(eventType: EventType, eventDate: string, leadName?: string): string {
  const dateStr = format(new Date(eventDate), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const suffix = leadName ? ` à ${leadName}` : '';
  switch (eventType) {
    case 'call': return `Appel effectué le ${dateStr}${suffix}`;
    case 'email': return `Email envoyé le ${dateStr}${suffix}`;
    case 'meeting': return `Réunion physique le ${dateStr}${suffix}`;
    case 'other': return `Message réseaux le ${dateStr}${suffix}`;
    default: return `Événement le ${dateStr}`;
  }
}

const schema = z.object({
  eventType: z.enum(['call', 'email', 'meeting', 'other'] as const),
  approachType: z.enum(['first', 'followup']).optional(),
  eventDate: z.string().min(1, 'Date requise'),
  description: z.string().optional(),
  leadId: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateEditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  defaultLeadId?: number;
  defaultLeadName?: string;
  onSuccess?: () => void;
}

export function CreateEditEventModal({
  open,
  onOpenChange,
  event,
  defaultLeadId,
  defaultLeadName,
  onSuccess,
}: CreateEditEventModalProps) {
  const isEdit = !!event;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const isLeadLocked = !!defaultLeadId;

  const [leadSearch, setLeadSearch] = useState('');
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);
  const [selectedLeadName, setSelectedLeadName] = useState<string | null>(defaultLeadName ?? null);

  const { data: leadsData } = useListLeads(
    { search: leadSearch, limit: 20 },
    { enabled: leadPopoverOpen && !isLeadLocked }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventType: 'call',
      approachType: undefined,
      eventDate: new Date().toISOString(),
      description: '',
      leadId: defaultLeadId ?? null,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (event) {
      form.reset({
        eventType: (event.eventType === 'followup' ? 'call' : event.eventType) as 'call' | 'email' | 'meeting' | 'other',
        approachType: event.approachType ?? undefined,
        eventDate: event.eventDate,
        description: event.description ?? '',
        leadId: event.leadId ?? null,
      });
      setSelectedLeadName(null);
    } else {
      form.reset({
        eventType: 'call',
        approachType: undefined,
        eventDate: new Date().toISOString(),
        description: '',
        leadId: defaultLeadId ?? null,
      });
      setSelectedLeadName(defaultLeadName ?? null);
    }
  }, [open, event, form, defaultLeadId, defaultLeadName]);

  const onSubmit = async (values: FormValues) => {
    const title = generateTitle(values.eventType, values.eventDate, selectedLeadName ?? undefined);
    const payload = {
      title,
      eventType: values.eventType,
      approachType: values.approachType,
      eventDate: new Date(values.eventDate).toISOString(),
      description: values.description || undefined,
      leadId: values.leadId ?? undefined,
    };

    try {
      if (isEdit && event) {
        await updateEvent.mutateAsync({ id: event.id, data: payload });
        toast.success('Événement mis à jour');
      } else {
        await createEvent.mutateAsync(payload);
        toast.success('Événement créé');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="eventType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="approachType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="first">1ère approche</SelectItem>
                        <SelectItem value="followup">Relance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="eventDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & heure *</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={(iso) => field.onChange(iso)}
                      placeholder="Sélectionner..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Notes sur cet échange..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Lead selector */}
              <FormField control={form.control} name="leadId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead associé</FormLabel>
                  {isLeadLocked ? (
                    <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center">
                      {selectedLeadName ?? 'Lead lié'}
                    </div>
                  ) : (
                    <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {selectedLeadName ?? 'Aucun lead'}
                            {field.value ? (
                              <X
                                className="h-4 w-4 opacity-50 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  field.onChange(null);
                                  setSelectedLeadName(null);
                                }}
                              />
                            ) : (
                              <ChevronsUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 overflow-hidden"
                        align="start"
                        style={{ width: 'var(--radix-popover-trigger-width)' }}
                      >
                        <div className="p-2">
                          <Input
                            placeholder="Rechercher un lead..."
                            value={leadSearch}
                            onChange={(e) => setLeadSearch(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-scroll" onWheel={(e) => e.stopPropagation()}>
                          {leadsData?.leads.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-3">Aucun résultat</p>
                          )}
                          {leadsData?.leads.map((lead) => {
                            const label = [lead.firstName, lead.name].filter(Boolean).join(' ');
                            return (
                              <button
                                key={lead.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors min-w-0"
                                onClick={() => {
                                  field.onChange(lead.id);
                                  setSelectedLeadName(label);
                                  setLeadPopoverOpen(false);
                                  setLeadSearch('');
                                }}
                              >
                                <Check className={cn('h-3.5 w-3.5 shrink-0', field.value === lead.id ? 'opacity-100' : 'opacity-0')} />
                                <div className="flex flex-col min-w-0 text-left">
                                  <span className="text-sm truncate">{label}</span>
                                  {lead.company && (
                                    <span className="text-xs text-muted-foreground truncate">{lead.company}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
