import { Suspense } from "react";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { SettingsService } from "@/lib/services/settings";
import { LeadsService } from "@/lib/services/leads";
import { ClientAutomationControl } from "@/components/client-automation-control";
import { ClientLeadTable } from "@/components/client-lead-table";
import { ClientHeader } from "@/components/client-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define component types
type PageDataType = {
  leads: any[];
  settings: any;
};

// Reusable Skeleton Components with improved styling
const Skeletons = {
  Header: () => (
    <div className="flex justify-between items-center mb-6 p-2 animate-pulse">
      <Skeleton className="h-9 w-48 rounded-md" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  ),
  AutomationControl: () => (
    <div className="flex items-center justify-between rounded-lg border p-4 mb-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <Skeleton className="h-6 w-11 rounded-md" />
    </div>
  ),
  LeadTable: () => (
    <div className="rounded-md border animate-pulse">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b last:border-0">
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ))}
    </div>
  ),
  FullPage: () => (
    <div className="space-y-6">
      <Skeletons.Header />
      <Skeletons.AutomationControl />
      <Skeletons.LeadTable />
    </div>
  )
};

// Enhanced Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary?: () => void }) => (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Something went wrong</AlertTitle>
    <AlertDescription className="flex flex-col gap-2">
      <p>{error.message}</p>
      {resetErrorBoundary && (
        <button 
          onClick={resetErrorBoundary}
          className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm self-start hover:bg-red-200 transition-colors"
        >
          Try again
        </button>
      )}
    </AlertDescription>
  </Alert>
);

// Data Fetching with Enhanced Error Handling
async function fetchPageData(): Promise<PageDataType> {
  try {
    // Create services
    const supabase = await createRouteHandlerClient();
    const settingsService = new SettingsService(supabase);
    const leadsService = new LeadsService(supabase);
  
    // Fetch data concurrently for better performance
    const [leadsResult, settingsResult] = await Promise.all([
      leadsService.getLeads(),
      settingsService.getAutomationSettings(),
    ]);

    // Validate results
    if (leadsResult.error) {
      console.error('Failed to fetch leads:', leadsResult.error);
      throw new Error(`Failed to fetch leads: ${leadsResult.error.message}`);
    }

    // Return formatted data
    return {
      leads: leadsResult.data || [],
      settings: settingsResult,
    };
  } catch (error) {
    console.error('Failed to fetch page data:', error);
    throw error instanceof Error 
      ? error 
      : new Error('An unexpected error occurred while fetching data');
  }
}

// Main Dashboard Component
export default async function DashboardPage() {
  // Fetch data using React Server Components
  const { leads, settings } = await fetchPageData();
  
  return (
    <div className="space-y-6 container mx-auto py-4 max-w-7xl">
      <ErrorBoundary 
        FallbackComponent={({ error, resetErrorBoundary }) => 
          <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
        }
      >
        <Suspense fallback={<Skeletons.Header />}>
          <ClientHeader />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary 
        FallbackComponent={({ error, resetErrorBoundary }) => 
          <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
        }
      >
        <Suspense fallback={<Skeletons.AutomationControl />}>
          <ClientAutomationControl initialSettings={settings} />
        </Suspense>
      </ErrorBoundary>
      
      <ErrorBoundary 
        FallbackComponent={({ error, resetErrorBoundary }) => 
          <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
        }
      >
        <Suspense fallback={<Skeletons.LeadTable />}>
          <ClientLeadTable initialLeads={leads} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
