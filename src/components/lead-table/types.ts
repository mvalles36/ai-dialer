import type { Lead } from "@/lib/supabase/types";

export interface CSVPreviewData {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  timezone?: string;
  status?: "untouched" | "error" | "pending" | "calling" | "no_answer" | "scheduled" | "not_interested";
}

export interface CSVDialogProps {
  previewData: CSVPreviewData[];
  onConfirm: (data: CSVPreviewData[]) => void;
  onCancel: () => void;
  open: boolean;
}

export interface LeadTableProps {
  initialLeads: Lead[];
}

export interface SortState {
  column: keyof Lead | null;
  direction: "asc" | "desc" | null;
}

export interface EditingCell {
  id: string;
  field: keyof Lead;
}

export interface LeadFormState {
  company_name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  status?: "untouched" | "error" | "pending" | "calling" | "no_answer" | "scheduled" | "not_interested";
}
