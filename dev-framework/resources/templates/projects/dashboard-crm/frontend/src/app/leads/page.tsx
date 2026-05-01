'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SearchInput } from '@/components/leads/SearchInput';
import { FiltersGroup } from '@/components/leads/FiltersGroup';
import { TableView } from '@/components/leads/TableView';
import { KanbanView } from '@/components/leads/KanbanView';
import { PaginationControls } from '@/components/leads/PaginationControls';
import { CreateEditLeadModal } from '@/components/leads/CreateEditLeadModal';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { SortControl } from '@/components/leads/SortControl';
import type { LeadSortBy } from '@/components/leads/SortControl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useListLeads } from '@/services/lead';
import { Lead } from '@/services/lead/types';
import { Plus } from 'lucide-react';

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<LeadSortBy>('last_activity_at');
  const [status, setStatus] = useState<string | null>(null);
  const [heatLevel, setHeatLevel] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLeadId, setSheetLeadId] = useState<number | null>(null);

  // Deep link: open sheet on mount if ?leadId= is present
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId) {
      setSheetLeadId(Number(leadId));
      setSheetOpen(true);
    }
  }, []);

  // Pagination pour la vue Kanban
  const [kanbanDisplayLimit, setKanbanDisplayLimit] = useState(20);

  // Utiliser les MÊMES paramètres pour les deux vues pour partager le cache
  const {
    data: leadsData,
    isLoading,
    refetch,
  } = useListLeads({
    page: 1,
    limit: 1000,
    status: status as any,
    heatLevel: heatLevel as any,
    city: city || undefined,
    search: search || undefined,
    sortBy,
    order: sortBy === 'name' ? 'asc' : 'desc',
  });

  const handleFilterChange = (filters: {
    status: string | null;
    heatLevel: string | null;
    city: string | null;
  }) => {
    setStatus(filters.status);
    setHeatLevel(filters.heatLevel);
    setCity(filters.city);
    setPage(1);
    setKanbanDisplayLimit(20);
  };

  const handleRowClick = (lead: Lead) => {
    setSheetLeadId(lead.id);
    setSheetOpen(true);
    router.replace(`/leads?leadId=${lead.id}`);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditModalOpen(true);
    setSheetOpen(false);
  };

  const handleSuccess = () => {
    refetch();
  };

  const handleLoadMoreKanban = () => {
    setKanbanDisplayLimit((prev) => prev + 20);
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setKanbanDisplayLimit(20);
  }, []);

  const hasMoreLeads = leadsData?.leads
    ? Object.values(
        leadsData.leads.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).some((count) => count > kanbanDisplayLimit)
    : false;

  // Pagination côté client pour la vue table
  const paginatedLeads = view === 'table' && leadsData?.leads
    ? leadsData.leads.slice((page - 1) * 100, page * 100)
    : leadsData?.leads || [];

  const totalPages = view === 'table' && leadsData?.leads
    ? Math.ceil(leadsData.leads.length / 100)
    : 1;

  return (
    <ProtectedRoute>
      <main className="p-6 space-y-4">
        {/* Ligne 1 : Recherche + Créer */}
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={handleSearchChange} />
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Créer un lead
          </Button>
        </div>

        {/* Ligne 2 : Filtres + Tri */}
        <div className="flex flex-wrap gap-2">
          <FiltersGroup
            status={status}
            heatLevel={heatLevel}
            city={city}
            onFilterChange={handleFilterChange}
          />
          <SortControl value={sortBy} onChange={setSortBy} />
        </div>

        {/* Ligne 3 : Switch de vue */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm cursor-pointer select-none ${view === 'table' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setView('table')}
            >
              Table
            </span>
            <button
              onClick={() => setView(view === 'table' ? 'kanban' : 'table')}
              className="relative w-11 h-6 rounded-full bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  view === 'kanban' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm cursor-pointer select-none ${view === 'kanban' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setView('kanban')}
            >
              Kanban
            </span>
          </div>
        </div>

        {/* Contenu */}
        <div className="mt-2">
          {view === 'table' ? (
            isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : paginatedLeads.length > 0 ? (
              <>
                <TableView leads={paginatedLeads} onRowClick={handleRowClick} />
                <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            ) : (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">Aucun lead trouvé</p>
                <Button onClick={() => setCreateModalOpen(true)}>Créer votre premier lead</Button>
              </div>
            )
          ) : (
            isLoading ? (
              <div className="flex gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-96 w-64" />
                ))}
              </div>
            ) : leadsData?.leads ? (
              <KanbanView
                leads={leadsData.leads}
                onCardClick={handleRowClick}
                displayLimit={kanbanDisplayLimit}
                onLoadMore={handleLoadMoreKanban}
                hasMore={hasMoreLeads}
              />
            ) : (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">Aucun lead trouvé</p>
                <Button onClick={() => setCreateModalOpen(true)}>Créer votre premier lead</Button>
              </div>
            )
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateEditLeadModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        mode="create"
        onSuccess={handleSuccess}
      />

      <CreateEditLeadModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        mode="edit"
        lead={selectedLead}
        onSuccess={handleSuccess}
      />

      <LeadDetailSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) router.replace('/leads');
        }}
        leadId={sheetLeadId}
        onEdit={handleEditLead}
        onDeleteSuccess={handleSuccess}
      />
    </ProtectedRoute>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsPageContent />
    </Suspense>
  );
}
