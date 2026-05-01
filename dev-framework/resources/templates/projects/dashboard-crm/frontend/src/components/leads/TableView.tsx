'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/services/lead/types';

interface TableViewProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
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

export function TableView({ leads, onRowClick }: TableViewProps) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun lead trouvé
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="max-w-[150px]">Nom</TableHead>
            <TableHead className="max-w-[150px]">Prénom</TableHead>
            <TableHead className="max-w-[200px]">Email</TableHead>
            <TableHead className="max-w-[180px]">Entreprise</TableHead>
            <TableHead className="max-w-[120px]">CA annuel</TableHead>
            <TableHead className="max-w-[100px]">Effectifs</TableHead>
            <TableHead className="max-w-[160px]">Statut</TableHead>
            <TableHead className="max-w-[120px]">Température</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              onClick={() => onRowClick(lead)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium max-w-[150px] truncate" title={lead.name}>
                {lead.name}
              </TableCell>
              <TableCell className="max-w-[150px] truncate" title={lead.firstName || '-'}>
                {lead.firstName || '-'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={lead.email}>
                {lead.email}
              </TableCell>
              <TableCell className="max-w-[180px] truncate" title={lead.company || '-'}>
                {lead.company || '-'}
              </TableCell>
              <TableCell className="max-w-[120px] text-right tabular-nums">
                {lead.ca != null ? `${lead.ca.toLocaleString('fr-FR')} €` : '-'}
              </TableCell>
              <TableCell className="max-w-[100px]">
                {lead.effectifs || '-'}
              </TableCell>
              <TableCell className="max-w-[160px]">
                <Badge variant="outline">
                  {STATUS_LABELS[lead.status] || lead.status}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[120px]">
                <Badge
                  className={HEAT_LEVEL_COLORS[lead.heatLevel]}
                  variant="secondary"
                >
                  {HEAT_LEVEL_LABELS[lead.heatLevel] || lead.heatLevel}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
