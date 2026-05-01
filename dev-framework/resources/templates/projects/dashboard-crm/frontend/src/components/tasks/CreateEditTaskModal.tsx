'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useCreateTask, useUpdateTask } from '@/services/task';
import type { Task } from '@/services/task';
import { useListLeads } from '@/services/lead';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(1, 'Titre requis').max(255, '255 caractères max'),
  description: z.string().optional(),
  category: z.enum(['commercial', 'delivery']),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().nullable().optional(),
  leadId: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateEditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSuccess?: () => void;
  defaultLeadId?: number;
  defaultLeadName?: string;
}

export function CreateEditTaskModal({
  open,
  onOpenChange,
  task,
  onSuccess,
  defaultLeadId,
  defaultLeadName,
}: CreateEditTaskModalProps) {
  const isEdit = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [leadSearch, setLeadSearch] = useState('');
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);
  const [selectedLeadName, setSelectedLeadName] = useState<string | null>(
    defaultLeadName ?? null
  );

  const { data: leadsData } = useListLeads(
    { search: leadSearch, limit: 20 },
    { enabled: leadPopoverOpen && !defaultLeadId }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: 'commercial',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      leadId: defaultLeadId ?? null,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (task) {
      form.reset({
        title: task.title,
        description: task.description ?? '',
        category: task.category,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
        leadId: task.leadId ?? null,
      });
      setSelectedLeadName(task.leadName ?? null);
    } else {
      form.reset({
        title: '',
        description: '',
        category: 'commercial',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        leadId: defaultLeadId ?? null,
      });
      setSelectedLeadName(defaultLeadName ?? null);
    }
  }, [open, task, form, defaultLeadId, defaultLeadName]);

  const onSubmit = async (values: FormValues) => {
    const base = {
      title: values.title,
      category: values.category,
      status: values.status,
      priority: values.priority,
      description: values.description || undefined,
      leadId: values.leadId ?? undefined,
    };

    try {
      if (isEdit && task) {
        await updateTask.mutateAsync({
          id: task.id,
          data: { ...base, dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null },
        });
        toast.success('Tâche mise à jour');
      } else {
        await createTask.mutateAsync({
          ...base,
          dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        });
        toast.success('Tâche créée');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  const isLeadLocked = !!defaultLeadId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Titre *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="low">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="todo">À faire</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="done">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value ? new Date(field.value).toISOString() : ''}
                      onChange={(iso) => field.onChange(iso)}
                      placeholder="Aucune deadline"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Lead field */}
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
                      <div className="max-h-40 overflow-y-scroll"
                        onWheel={(e) => e.stopPropagation()}
                      >
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
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
