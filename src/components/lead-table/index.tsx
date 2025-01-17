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

  const { sortState, handleSort, getSortedLeads } = useLeadSort();
  const sortedLeads = getSortedLeads(rawLeads);
  const {
    csvPreviewData,
    showCSVPreview,
    fileInputRef,
    handleFileUpload,
    handleCSVImport,
    setShowCSVPreview,
  } = useCSVImport(() => fetchLeads(false));
  const { pageSize, setPageSize } = usePageSize();

  const fetchLeads = async (showSuccessToast = false, forceRefresh = false) => {
    if (!forceRefresh && currentPage === 1 && rawLeads === initialLeads && !sortState.column) {
      return;
    }

    try {
      const { data, error, count } = await leadsService.getLeads({
        sortBy: sortState.column
          ? { column: sortState.column, ascending: sortState.direction === "asc" }
          : undefined,
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
          ? { column: sortState.column, ascending: sortState.direction === "asc" }
          : undefined,
        page: currentPage,
        pageSize,
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
      .channel("leads-table-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, handleDatabaseChange)
      .subscribe();

    return () => {
      subscription.unsubscribe();
      handleDatabaseChange.cancel();
    };
  }, [handleDatabaseChange]);

  const handleManualRefresh = () => {
    fetchLeads(true, true);
  };

  const handleAddLead = async (data: Partial<Lead>) => {
    data.status = data.status || "untouched"; // Assign default value if undefined

    const { data: newLead, error } = await leadsService.createLead(data);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add lead. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (newLead) {
      setRawLeads([newLead, ...rawLeads]);
      setIsAddingLead(false);
      toast({
        title: "Success",
        description: "Lead added successfully.",
        variant: "success",
      });
    }
  };

  const handleDeleteLeads = async () => {
    const results = await Promise.all(selectedLeads.map((id) => leadsService.deleteLead(id)));

    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={handleManualRefresh} variant="outline">
          <RefreshCw size={16} className="mr-2" />
          Refresh Leads
        </Button>
      </div>

      <Table>
        <LeadTableHeader
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          totalRecords={totalRecords}
          onSortChange={handleSort}
          sortState={sortState}
        />

        <LeadTableBody
          leads={sortedLeads}
          selectedLeads={selectedLeads}
          setSelectedLeads={setSelectedLeads}
          FIELD_MAPPINGS={FIELD_MAPPINGS}
          NON_EDITABLE_FIELDS={NON_EDITABLE_FIELDS}
          isAddingLead={isAddingLead}
          setIsAddingLead={setIsAddingLead}
        />
      </Table>

      <CSVPreviewDialog
        isOpen={showCSVPreview}
        onClose={() => setShowCSVPreview(false)}
        csvData={csvPreviewData}
        onImport={handleCSVImport}
      />

      <LeadFormDialog
        isOpen={isAddingLead}
        onClose={() => setIsAddingLead(false)}
        onSave={handleAddLead}
      />
    </div>
  );
}
