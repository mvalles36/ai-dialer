import { Suspense } from "react";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { SettingsService } from "@/lib/services/settings";
import { LeadsService } from "@/lib/services/leads";
import { ClientAutomationControl } from "@/components/client-automation-control";
import { ClientLeadTable } from "@/components/client-lead-table";
import { ClientHeader } from "@/components/client-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";

// Reusable Skeleton Components
const Skeletons = {
  Header: () => (
    <div className="flex justify-between items-center">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-24" />
    </div>
  ),
  AutomationControl: () => (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-6 w-11" />
    </div>
  ),
  LeadTable: () => (
    <div className="rounded-md border">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-8 w-full" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b last:border-0">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
};

// Error Fallback Component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="text-red-500 p-4">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
  </div>
);

// Data Fetching with Enhanced Error Handling
async function fetchPageData() {
  try {
    const supabase = await createRouteHandlerClient();
    const settingsService = new SettingsService(supabase);
    const leadsService = new LeadsService(supabase);
  
    const [leadsResult, settingsResult] = await Promise.all([
      leadsService.getLeads(),
      settingsService.getAutomationSettings(),
    ]);

    if (leadsResult.error) {
      throw new Error(leadsResult.error.message);
    }

    return {
      leads: leadsResult.data || [],
      settings: settingsResult,
    };
  } catch (error) {
    console.error('Failed to fetch page data:', error);
    throw error;
  }
}

export default async function DashboardPage() {
  const { leads, settings } = await fetchPageData();
  
  return (
    <div className="space-y-6">
      <ErrorBoundary fallback={<Skeletons.Header />}>
        <Suspense fallback={<Skeletons.Header />}>
          <ClientHeader />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<Skeletons.AutomationControl />}>
        <Suspense fallback={<Skeletons.AutomationControl />}>
          <ClientAutomationControl initialSettings={settings} />
        </Suspense>
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<Skeletons.LeadTable />}>
        <Suspense fallback={<Skeletons.LeadTable />}>
          <ClientLeadTable initialLeads={leads} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
