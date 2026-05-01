'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FiltersGroupProps {
  status: string | null;
  heatLevel: string | null;
  city: string | null;
  onFilterChange: (filters: {
    status: string | null;
    heatLevel: string | null;
    city: string | null;
  }) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'identified', label: 'Identifié' },
  { value: 'qualified', label: 'Qualifié' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'lost', label: 'Perdu' },
  { value: 'closed', label: 'Closé' },
  { value: 'onboarded', label: 'Onboardé' },
  { value: 'delivered', label: 'Livré' },
  { value: 'upsold', label: 'Upsellé' },
];

const HEAT_LEVEL_OPTIONS = [
  { value: 'all', label: 'Toutes températures' },
  { value: 'cold', label: 'Froid' },
  { value: 'warm', label: 'Tiède' },
  { value: 'hot', label: 'Chaud' },
  { value: 'very_hot', label: 'Très chaud' },
];

export function FiltersGroup({
  status,
  heatLevel,
  city,
  onFilterChange,
}: FiltersGroupProps) {
  return (
    // display:contents — les 3 enfants participent directement au flex parent
    <div className="contents">
      <div className="flex-1 min-w-[140px]">
        <Select
          value={status || 'all'}
          onValueChange={(value) =>
            onFilterChange({ status: value === 'all' ? null : value, heatLevel, city })
          }
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[140px]">
        <Select
          value={heatLevel || 'all'}
          onValueChange={(value) =>
            onFilterChange({ status, heatLevel: value === 'all' ? null : value, city })
          }
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HEAT_LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Input
        placeholder="Filtrer par ville..."
        value={city || ''}
        onChange={(e) => onFilterChange({ status, heatLevel, city: e.target.value || null })}
        className="flex-1 min-w-[140px]"
      />
    </div>
  );
}
