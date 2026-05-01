'use client';

// import { useMemo } from 'react';
// import { KpiCard } from '@/components/dashboard/KpiCard';
// import { useListLeads } from '@/services/lead';
// import { useOverdueCount } from '@/services/task';
// import { LeadStatus } from '@/services/lead/types';
// import { Users, TrendingUp, Target, AlertTriangle } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ApproachesTable } from '@/components/dashboard/ApproachesTable';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre activité</p>
        </div>

        {/* KPI Cards — désactivés temporairement */}
        {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Leads total" ... />
          <KpiCard title="CA Pipeline" ... />
          <KpiCard title="Taux de conversion" ... />
          <KpiCard title="Tâches en retard" ... />
        </div> */}

        {/* Approaches table */}
        <ApproachesTable />
      </div>
    </ProtectedRoute>
  );
}
