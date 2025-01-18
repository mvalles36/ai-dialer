'use client';

import { useState } from 'react';
import { LeadTable } from './lead-table';
import type { Lead } from '@/lib/supabase/types';

export function ClientLeadTable({ initialLeads }: { initialLeads: Lead[] }) {
  // State for selected leads and sorting
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sortState, setSortState] = useState({
    column: null as keyof Lead | null,
    direction: null as 'asc' | 'desc' | null
  });
  const totalRecords = initialLeads.length;

  // Handle sorting changes
  const handleSortChange = (column: keyof Lead) => {
    setSortState(prevState => {
      if (prevState.column === column) {
        return {
          column,
          direction: prevState.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { column, direction: 'asc' };
    });
  };

  return (
    <LeadTable
      initialLeads={initialLeads}
      selectedLeads={selectedLeads}
      setSelectedLeads={setSelectedLeads}
      totalRecords={totalRecords}
      onSortChange={handleSortChange}
      sortState={sortState}
    />
  );
}
