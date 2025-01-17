"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Table } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@/lib/supabase/types";
import { leadsService } from "@/lib/services/leads";
import { supabase } from "@/lib/supabase/client";
import debounce from "lodash/debounce";

// Import components and hooks
import { CSVPreviewDialog } from "./csv-preview-dialog";
import { LeadFormDialog } from "./lead-form-dialog";
import { LeadTableHeader } from "./table-header";
import { LeadTableBody } from "./table-body";
import { useLeadSort } from "./hooks/use-lead-sort";
import { useCSVImport } from "./hooks/use-csv-import";
import { usePageSize } from "./hooks/use-page-size";
import { LeadTableProps, EditingCell } from "./types";
import { FIELD_MAPPINGS, NON_EDITABLE_FIELDS } from "./constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "./pagination";

export function LeadTable({ initialLeads }: LeadTableProps) {
  const [rawLeads, setRawLeads] = useState<Lead[]>(initialLeads);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(initialLeads.length);
  const { toast } = useToast();

  // Initialize hooks
  const { sortState, handleSort, getSortedLeads } = useLeadSort();
  const sortedLeads = getSortedLeads(rawLeads);
  const { csvPreviewData, showCSVPreview, fileInputRef, handleFileUpload, handleCSVImport, setShowCSVPreview } = useCSVImport(() => fetchLeads(false));
  const { pageSize, setPageSize } = usePageSize();

  const fetchLeads = async (showSuccessToast = false, forceRefresh = false) => {
    console.log('fetchLeads called:', {
      currentPage,
      pageSize,
      hasSort: !!sortState.column,
      forceRefresh
    });

    if (!forceRefresh && currentPage === 1 && rawLeads === initialLeads && !sortState.column) {
      console.log('Skipping fetch - using initial data');
      return;
    }

    try {
      const { data, error, count } = await leadsService.getLeads({
        sortBy: sortState.column ? {
          column: sortState.column,
          ascending: sortState.direction === 'asc'
        } : undefined,
        page: currentPage,
        pageSize,
      });

      if (error) {
        toast({
          title: "Error fetching leads",
          description: error.message || "An unexpected error occurred while fetching leads",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setRawLeads(data);
        setTotalRecords(count);

        if (showSuccessToast) {
          toast({
            title: "Success",
            description: "Leads refreshed successfully",
            variant: "success",
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLeads(false, false);
  }, [currentPage, pageSize, sortState]);

  const handleDatabaseChange = useCallback(
    debounce(async () => {
      const { data: updatedLeads, error, count } = await leadsService.getLeads({
        sortBy: sortState.column
          ? {
              column: sortState.column,
              ascending: sortState.direction === "asc",
            }
          : undefined,
        page: currentPage,
        pageSize: pageSize,
      });

      if (error) {
        toast({
          title: "Error refreshing leads",
          description: "There was a problem updating the table.",
          variant: "destructive",
        });
        return;
      }

      if (updatedLeads) {
        setRawLeads(updatedLeads);
        if (count !== undefined) {
          setTotalRecords(count);
        }
      }
    }, 250),
    [currentPage, pageSize, sortState, toast]
  );

  useEffect(() => {
    const subscription = supabase
      .channel('leads-table-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        handleDatabaseChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        handleDatabaseChange
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
        },
        handleDatabaseChange
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      handleDatabaseChange.cancel();
    };
  }, [handleDatabaseChange]);

  const handleManualRefresh = () => {
    fetchLeads(true, true);
  };

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    const { success, data, error } = await leadsService.updateLead(id, updates);
    if (!success || !data) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
      return false;
    }
    
    setRawLeads(prevLeads => 
      prevLeads.map(lead => lead.id === id ? {
        ...lead, 
        ...data,
        ...Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        )
      } : lead)
    );
    
    return true;
  };

  const handleDeleteLeads = async () => {
    const results = await Promise.all(
      selectedLeads.map((id) => leadsService.deleteLead(id))
    );

    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
      console.error("Error deleting leads:", errors);
      toast({
        title: "Error",
        description: `Failed to delete ${errors.length} leads. Please try again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedLeads.length} leads.`,
        variant: "success",
      });
    }

    setIsDeleteDialogOpen(false);
    setSelectedLeads([]);
    fetchLeads();
  };

  const handleAddLead = async (data: Partial<Lead>) => {
    const newLead = {
      company_name: data.company_name || '',
      contact_name: data.contact_name || data.company_name || 'Unknown Contact',
      phone: data.phone || '',
      email: data.email || '',
      timezone: data.timezone || 'America/Los_Angeles',
      ...data,
      status: "pending" as const,
      call_attempts: 0,
      last_called_at: null,
      cal_booking_uid: null,
      follow_up_email_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdLead, error } = await leadsService.createLead(newLead);
    if (error || !createdLead) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Lead created successfully.",
        variant: "success",
      });
      setIsAddingLead(false);
      fetchLeads(false, true);
    }
  };

  const handleBulkStatusUpdate = async (status: Lead["status"]) => {
    const { success, data, error } = await leadsService.updateLeadStatus(selectedLeads, status);

    if (!success || !data) {
      toast({
        title: "Error",
        description: "Failed to update lead statuses. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Successfully updated ${selectedLeads.length} lead statuses.`,
        variant: "success",
      });
      setSelectedLeads([]);
      fetchLeads();
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedLeads(e.target.checked ? rawLeads.map((lead) => lead.id) : []);
  };

  return (
    <div className="overflow-hidden">
      <div className="flex justify-between items-center py-4">
        <Button onClick={handleManualRefresh} variant="outline">
          <RefreshCw className="mr-2" /> Refresh Leads
        </Button>
        {selectedLeads.length > 0 && (
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Bulk Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Manage Selected</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate("in_progress")}>
                  Set to In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate("completed")}>
                  Set to Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
                  Delete Selected Leads
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Table>
        <LeadTableHeader
          selectedLeads={selectedLeads}
          handleSelectAll={handleSelectAll}
          sortState={sortState}
          onSort={handleSort}
        />
        <LeadTableBody
          leads={sortedLeads}
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          setEditingCell={setEditingCell}
        />
      </Table>

      <Pagination
        currentPage={currentPage}
        totalRecords={totalRecords}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      <CSVPreviewDialog
        show={showCSVPreview}
        onClose={() => setShowCSVPreview(false)}
        previewData={csvPreviewData}
        onConfirm={handleCSVImport}
      />

      <LeadFormDialog
        isOpen={isAddingLead}
        onClose={() => setIsAddingLead(false)}
        onSubmit={handleAddLead}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the selected leads?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLeads}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
