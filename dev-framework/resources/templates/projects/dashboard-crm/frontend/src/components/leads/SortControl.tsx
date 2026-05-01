'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type LeadSortBy = 'last_activity_at' | 'updated_at' | 'created_at' | 'name';

const SORT_OPTIONS: { value: LeadSortBy; label: string }[] = [
  { value: 'last_activity_at', label: 'Activité récente' },
  { value: 'created_at', label: 'Création' },
  { value: 'updated_at', label: 'Modification' },
  { value: 'name', label: 'A → Z' },
];

interface SortControlProps {
  value: LeadSortBy;
  onChange: (value: LeadSortBy) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="flex-1 min-w-[140px]">
      <Select value={value} onValueChange={(v) => onChange(v as LeadSortBy)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
