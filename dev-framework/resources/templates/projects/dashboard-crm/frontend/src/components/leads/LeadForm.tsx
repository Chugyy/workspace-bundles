'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, LeadStatus, HeatLevel } from '@/services/lead/types';

const leadFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255),
  firstName: z.string().max(255).optional(),
  email: z.string().email('Email invalide').max(255).or(z.literal('')),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  instagram: z.string().max(255).optional(),
  linkedin: z.string().max(255).optional(),
  twitter: z.string().max(255).optional(),
  youtube: z.string().max(255).optional(),
  website: z.string().max(255).optional(),
  ca: z.string().optional(),
  effectifs: z.string().max(50).optional(),
  status: z.nativeEnum(LeadStatus),
  heatLevel: z.nativeEnum(HeatLevel),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Lead | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function LeadForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting,
}: LeadFormProps) {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      firstName: defaultValues?.firstName || '',
      email: defaultValues?.email || '',
      phone: defaultValues?.phone || '',
      company: defaultValues?.company || '',
      address: defaultValues?.address || '',
      instagram: defaultValues?.instagram || '',
      linkedin: defaultValues?.linkedin || '',
      twitter: defaultValues?.twitter || '',
      youtube: defaultValues?.youtube || '',
      website: defaultValues?.website || '',
      ca: defaultValues?.ca != null ? String(defaultValues.ca) : '',
      effectifs: defaultValues?.effectifs || '',
      status: defaultValues?.status || LeadStatus.IDENTIFIED,
      heatLevel: defaultValues?.heatLevel || HeatLevel.COLD,
    },
  });

  const handleSubmit = (data: LeadFormValues) => {
    onSubmit({
      ...data,
      ca: data.ca !== '' && data.ca != null ? parseInt(data.ca, 10) : null,
    });
  };

  return (
    <Form {...form}>
      <form
        id="lead-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entreprise</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site web</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CA annuel (€)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectifs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effectifs</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex: 3-5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={LeadStatus.IDENTIFIED}>Identifié</SelectItem>
                        <SelectItem value={LeadStatus.QUALIFIED}>Qualifié</SelectItem>
                        <SelectItem value={LeadStatus.CONTACTED}>Contacté</SelectItem>
                        <SelectItem value={LeadStatus.FOLLOW_UP}>Follow up</SelectItem>
                        <SelectItem value={LeadStatus.LOST}>Perdu</SelectItem>
                        <SelectItem value={LeadStatus.CLOSED}>Closé</SelectItem>
                        <SelectItem value={LeadStatus.ONBOARDED}>Onboardé</SelectItem>
                        <SelectItem value={LeadStatus.DELIVERED}>Livré</SelectItem>
                        <SelectItem value={LeadStatus.UPSOLD}>Upsellé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="heatLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Température *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={HeatLevel.COLD}>Froid</SelectItem>
                        <SelectItem value={HeatLevel.WARM}>Tiède</SelectItem>
                        <SelectItem value={HeatLevel.HOT}>Chaud</SelectItem>
                        <SelectItem value={HeatLevel.VERY_HOT}>
                          Très chaud
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </div>
      </form>
    </Form>
  );
}
