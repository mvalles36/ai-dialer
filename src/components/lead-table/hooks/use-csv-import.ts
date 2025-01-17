import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { leadsService } from "@/lib/services/leads";
import { CSVPreviewData } from "../types";

export function useCSVImport(onLeadsUpdate: () => void) {
  const [csvPreviewData, setCSVPreviewData] = useState<CSVPreviewData[]>([]);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text
          .split(/\r?\n/)
          .filter((row) => row.trim().length > 0);

        if (rows.length < 2) {
          throw new Error("CSV file must contain headers and at least one row");
        }

        // Process headers
        const headers = rows[0]
          .split(",")
          .map((header) =>
            header
              .trim()
              .toLowerCase()
              .replace(/['"]/g, "") // Remove quotes
              .replace(/\s+/g, "_") // Replace spaces with underscore
          );

        // Find the indices of required columns
        const companyNameIndex = headers.findIndex(
          (h) =>
            h.includes("company") ||
            h.includes("business")
        );
        const contactNameIndex = headers.findIndex(
          (h) =>
            h.includes("contact_name") ||
            h.includes("contact") && h.includes("name")
        );
        const phoneIndex = headers.findIndex(
          (h) =>
            h.includes("phone") || h.includes("tel")
        );
        const emailIndex = headers.findIndex(
          (h) =>
            h.includes("email") || h.includes("mail") || h.includes("e-mail")
        );

        if (
          companyNameIndex === -1 ||
          contactNameIndex === -1 ||
          phoneIndex === -1 ||
          emailIndex === -1
        ) {
          throw new Error(
            "Could not find required columns (company name, contact name, phone, email)"
          );
        }

        // Parse data rows
        const parsedData: CSVPreviewData[] = rows
          .slice(1)
          .map((row) => {
            // Handle both quoted and unquoted values
            const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanValues = values.map((val) =>
              val.replace(/^"|"$/g, "").trim()
            );

            return {
              company_name: cleanValues[companyNameIndex] || "",
              contact_name: cleanValues[contactNameIndex] || "",
              phone: cleanValues[phoneIndex] || "",
              email: cleanValues[emailIndex] || "",
            };
          })
          .filter((row) => row.company_name && row.contact_name && row.phone && row.email);

        if (parsedData.length === 0) {
          throw new Error("No valid data rows found in CSV");
        }

        setCSVPreviewData(parsedData);
        setShowCSVPreview(true);
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description:
            error instanceof Error ? error.message : "Invalid CSV format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    // Reset the file input
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleCSVImport = async (data: CSVPreviewData[]) => {
    const newLeads = data.map((row) => ({
      ...row,
      status: "untouched" as const,
      call_attempts: 0,
      last_called_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cal_booking_uid: null, // Add missing required property
      follow_up_email_sent: false, // Add missing required property
      timezone: "America/Chicago" // Default timezone
    }));

    try {
      const { success, error } = await leadsService.createLeads(newLeads);
      
      if (!success) {
        console.error("Error importing leads:", error);
        toast({
          title: "Error",
          description: "Failed to import leads. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "CSV imported",
          description: `${data.length} lead(s) have been imported successfully.`,
          variant: "success",
        });
      }

      onLeadsUpdate();
      setShowCSVPreview(false);
      setCSVPreviewData([]);
    } catch (error) {
      toast({
        title: "Error importing leads",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    csvPreviewData,
    showCSVPreview,
    fileInputRef,
    handleFileUpload,
    handleCSVImport,
    setShowCSVPreview,
  };
}
