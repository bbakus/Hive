
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useEffect, useState, useCallback } from "react"; // Removed useCallback as it's not used temporarily
import { Loader2, AlertTriangle, Download, CheckCircle, XCircle, Info, FileText, Server, Users, HardDrive, ShieldCheck, Settings2, FolderOpen, UserCircle, PowerSquare, Binary, Laptop, CalendarClock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { format, parseISO } from "date-fns"; // Keep format and parseISO if used in static JSX part

// --- Report Data Structure Interfaces (Keep these as they define props structure if any part of JSX uses it) ---
interface ReportUser {
  userId: string;
  name: string;
}
interface ReportEvent {
  id: string;
  name: string;
  folderHint?: string;
}
interface ReportPhotographer {
  id: string;
  name: string;
  initials?: string;
}
interface ReportSummaryInfo {
  id: string;
  timestamp: string;
  performedBy?: ReportUser;
  ingestUtilityVersion?: string;
  event?: ReportEvent;
  photographer?: ReportPhotographer;
}
interface ReportSource {
  id: string;
  path: string;
  selectedAt: string;
}
interface ReportDestinations {
  workingBase?: string;
  effectiveWorking?: string;
  backupBase?: string;
  effectiveBackup?: string;
}
interface ReportPhase {
  started: string;
  ended: string;
  status: string;
  [key: string]: any;
}
interface ReportPhases {
  merge?: ReportPhase & { filesMerged?: number; totalBytes?: number; tempPath?: string };
  copy?: ReportPhase & { filesCopied?: number; bytesCopied?: number; workingStatus?: string; backupStatus?: string };
  checksum?: ReportPhase & { algorithm?: string; tempHash?: string; tempHashBytes?: number; workingHash?: string; backupHash?: string; matchesWorking?: boolean; matchesBackup?: boolean };
}
interface ReportFileDetail {
  name: string;
  size: number;
  checksum?: string;
  copiedToWorking?: boolean;
  matchedEvent?: boolean;
  status: "Ingested" | "Excluded" | string;
  reason?: string;
}
interface ReportOverallSummary {
  totalFilesAttempted: number;
  totalFilesIngested: number;
  totalBytesIngested: number;
  excludedFiles: Array<{ name: string; reason: string }>;
  overallStatus: string;
  notes: string[];
}

interface ReportEnvironment {
  ingestUtilityVersion?: string;
  nodeVersion?: string;
  electronVersion?: string;
  osVersion?: string;
  locale?: string;
  network?: string;
  [key: string]: any;
}
interface ReportSecurity {
  encrypted?: boolean;
  algorithm?: string;
  checksum?: string;
  signedBy?: string;
}
interface FullIngestionReport {
  reportSummary: ReportSummaryInfo;
  sources?: ReportSource[];
  destinations?: ReportDestinations;
  phases?: ReportPhases;
  fileDetails?: ReportFileDetail[];
  overallSummary?: ReportOverallSummary;
  environment?: ReportEnvironment;
  security?: ReportSecurity;
}

// --- Helper Components & Functions (Assuming these are syntactically correct) ---
const SectionCard: React.FC<{ title: string; icon?: React.ElementType; children: React.ReactNode; className?: string; isEmpty?: boolean }> = ({ title, icon: Icon, children, className, isEmpty }) => (
  <div className={cn("section-card-print print:p-0 print:mb-4", className)}>
    <h3 className="text-md font-semibold mb-3 flex items-center print:text-base print:mb-1">
      {Icon && <Icon className="mr-2 h-5 w-5 text-accent print:h-4 print:w-4" />}
      {title}
    </h3>
    {isEmpty ? <p className="text-xs text-muted-foreground italic print:text-xs">No data provided for this section.</p> : <div className="space-y-2 text-xs print:space-y-1">{children}</div>}
  </div>
);

const InfoPair: React.FC<{ label: string; value?: string | number | boolean | null; className?: string; children?: React.ReactNode }> = ({ label, value, className, children }) => (
  <div className={cn("info-pair-print flex flex-col sm:flex-row sm:items-start print:flex-row", className)}>
    <p className="font-medium text-muted-foreground sm:w-1/3 print:w-[30%] print:min-w-[130px] print:pr-4 print:font-normal">{label}:</p>
    {children ? <div className="sm:w-2/3 print:w-[70%]">{children}</div> : <p className="sm:w-2/3 break-words print:w-[70%]">{value === undefined || value === null || String(value).trim() === "" ? <span className="italic text-muted-foreground/70">N/A</span> : String(value)}</p>}
  </div>
);

const formatBytes = (bytes?: number, decimals = 2) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return 'N/A';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StatusBadge: React.FC<{ status?: string | boolean | null }> = ({ status }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let text = String(status).toLowerCase();

  if (typeof status === "boolean") text = status ? "yes" : "no";
  if (status === null || status === undefined || text === "undefined" || String(status).trim() === "") text = "n/a";

  if (["success", "verified", "passed", "true", "yes", "ingested", "completed"].includes(text)) variant = "default";
  else if (["failed", "error", "no", "excluded", "false"].includes(text)) variant = "destructive";
  else if (["processing", "pending", "copying", "checksumming"].includes(text)) variant = "secondary";

  const printClass = "print-status-badge";

  return <Badge variant={variant} className={cn("capitalize text-xs print:text-[10px] print:px-1 print:py-0", printClass)}>{String(status === undefined || status === null || String(status).trim() === "" ? "N/A" : status)}</Badge>;
};


// --- Main Dialog Component ---
interface IngestionReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  reportUrl: string;
}

export function IngestionReportDialog({
  isOpen,
  onOpenChange,
  reportUrl,
}: IngestionReportDialogProps) {
  // Temporarily comment out state
  // const [reportData, setReportData] = useState<FullIngestionReport | null>(null);
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // Temporarily comment out useEffect
  // useEffect(() => {
  //   if (isOpen && reportUrl) {
  //     setIsLoading(true);
  //     setError(null);
  //     setReportData(null);
  //     fetch(reportUrl)
  //       .then(async (response) => {
  //         if (!response.ok) {
  //           const errorText = await response.text();
  //           throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 200)}`);
  //         }
  //         return response.json();
  //       })
  //       .then((data: FullIngestionReport) => {
  //         setReportData(data);
  //       })
  //       .catch((err) => {
  //         console.error("Error fetching ingestion report:", err);
  //         setError(err.message || "Could not load report data.");
  //       })
  //       .finally(() => {
  //         setIsLoading(false);
  //       });
  //   } else if (!isOpen) {
  //     setReportData(null);
  //     setIsLoading(false);
  //     setError(null);
  //   }
  // }, [isOpen, reportUrl]);

  // Temporarily comment out handlePrintReport
  // function handlePrintReport() {
  //   console.log("handlePrintReport called. reportData exists:", !!reportData, "isLoading:", isLoading);
  //   if (!reportData || isLoading) {
  //     console.warn("Print button clicked but reportData not ready or still loading. Button should be disabled.");
  //     return;
  //   }
  //   try {
  //     console.log("Attempting window.print()...");
  //     const originalTitle = document.title;
  //     if (reportData?.reportSummary?.id) {
  //       document.title = `IngestionReport_${reportData.reportSummary.id}`;
  //     } else {
  //       document.title = "HIVE_Ingestion_Report";
  //     }
  //     window.print();
  //     setTimeout(() => { document.title = originalTitle; }, 1000); 
  //     console.log("window.print() called (browser print dialog should appear).");
  //   } catch (e) {
  //     console.error("Error calling window.print():", e);
  //   }
  // }
  // END OF JS LOGIC TEMPORARILY COMMENTED OUT
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col print:h-auto print:max-w-full print:border-0 print:shadow-none print:dialog-content-reset">
        <DialogHeader className="print:hidden">
          <DialogTitle>Ingestion Report Details</DialogTitle>
          <DialogDescription>
            {/* Report ID: {reportData?.reportSummary?.id || "Loading..."} (From: {reportUrl}) */}
            Report ID: Loading... (From: {reportUrl})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea id="ingestion-report-content" className="flex-grow my-2 pr-0 print:overflow-visible print:pr-0 print:my-0">
            {/* Printable Header - Rendered with placeholder data or static for now */}
            <div className="hidden print:block printable-dialog-header">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Icons.HiveLogo className="h-8 w-8 text-accent" />
                    <div>
                        <h2 className="!mb-0">Ingestion Report</h2>
                        <p className="!text-xs !text-muted-foreground">Report ID: Placeholder_Report_ID</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Date: {format(new Date(), "M/d/yy, p")}
                </p>
              </div>
              <hr className="print:mt-2 print:mb-4 print:border-border/50" />
            </div>

            {/* {isLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Loading report...</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="my-4 print:hidden">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Report</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {reportData && !isLoading && (
              <div className="space-y-3 p-1 print:space-y-2 print:p-0">
                {reportData.reportSummary?.photographer && (
                    <div className="print-photographer-info print:mb-4">
                         <InfoPair label="Photographer ID (HIVE)" value={reportData.reportSummary.photographer.id} />
                         <InfoPair label="Photographer Initials" value={reportData.reportSummary.photographer.initials} />
                    </div>
                )}
                {/* ... Other sections will be empty or use placeholder data ... */}
              {/* </div>
            )} */}
            <div className="p-4 text-center text-muted-foreground">
                Report content is temporarily simplified for debugging.
            </div>
        </ScrollArea>
        <Alert variant="default" className="mt-2 print:hidden">
          <Info className="h-4 w-4" />
          <AlertTitle>Exporting This Report</AlertTitle>
          <AlertDescription className="text-xs">
            To save this report as a PDF, click the "Download PDF" button. This will use your browser&apos;s print functionality.
            Ensure you select "Save as PDF" as the destination in the print preview dialog.
            Adjust layout options (e.g., "Portrait", "Fit to page", and **disable "Headers and footers"**) in the print dialog for best results.
          </AlertDescription>
        </Alert>
        <DialogFooter className="mt-auto pt-4 border-t border-border/50 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={() => console.log("Print button clicked - functionality temporarily simplified")}
            variant="accent"
            // disabled={!reportData || isLoading}
            disabled={true} // Temporarily disable if data loading is commented
          >
            <Download className="mr-2 h-4 w-4"/> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    