
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
import React, { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, Download, CheckCircle, XCircle, Info, FileText, Server, Users, HardDrive, ShieldCheck, Settings2, FolderOpen, UserCircle, PowerSquare, Binary, Laptop, CalendarClock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { format, parseISO } from "date-fns";

// --- Report Data Structure Interfaces ---
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
  duration?: string; // For Merge Phase in image
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
export interface FullIngestionReport { // Exported for potential use in API route typing
  reportSummary: ReportSummaryInfo;
  sources?: ReportSource[];
  destinations?: ReportDestinations;
  phases?: ReportPhases;
  fileDetails?: ReportFileDetail[];
  overallSummary?: ReportOverallSummary;
  environment?: ReportEnvironment;
  security?: ReportSecurity;
}

// --- Helper Components & Functions ---
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
  <div className={cn("info-pair-print flex flex-col sm:flex-row sm:items-start print:flex-row print:items-baseline", className)}>
    <p className="font-medium text-muted-foreground sm:w-1/3 print:w-auto print:pr-2 print:font-normal print:flex-shrink-0">{label}:</p>
    {children ? <div className="sm:w-2/3 print:w-auto print:flex-grow">{children}</div> : <p className="sm:w-2/3 break-words print:w-auto print:flex-grow">{value === undefined || value === null || String(value).trim() === "" ? <span className="italic text-muted-foreground/70">N/A</span> : String(value)}</p>}
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
  const [reportData, setReportData] = useState<FullIngestionReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && reportUrl) {
      setIsLoading(true);
      setError(null);
      setReportData(null);
      fetch(reportUrl)
        .then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 200)}`);
          }
          return response.json();
        })
        .then((data: FullIngestionReport) => {
          setReportData(data);
        })
        .catch((err) => {
          console.error("Error fetching ingestion report:", err);
          setError(err.message || "Could not load report data.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!isOpen) {
      // Reset state when dialog closes
      setReportData(null);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, reportUrl]);

  function handlePrintReport() {
    if (!reportData || isLoading) {
      console.warn("Print button clicked but reportData not ready or still loading. Button should be disabled.");
      return;
    }
    try {
      const originalTitle = document.title;
      if (reportData?.reportSummary?.id) {
        document.title = `IngestionReport_${reportData.reportSummary.id}`;
      } else {
        document.title = "HIVE_Ingestion_Report";
      }
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
    } catch (e) {
      console.error("Error calling window.print():", e);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col print:h-auto print:max-w-full print:border-0 print:shadow-none print:dialog-content-reset">
        <DialogHeader className="print:header-for-print">
          <DialogTitle className="print:title-for-print">Ingestion Report Details</DialogTitle>
          <DialogDescription className="print:description-for-print">
            Report ID: {isLoading ? "Loading..." : (reportData?.reportSummary?.id || "N/A")} (From: {reportUrl})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea id="ingestion-report-content" className="flex-grow my-2 pr-0 print:overflow-visible print:pr-0 print:my-0">
            {isLoading && (
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
                {/* --- Report Summary Section --- */}
                <SectionCard title="Report Summary" icon={Info}>
                  <InfoPair label="Report ID" value={reportData.reportSummary.id} />
                  <InfoPair label="Timestamp" value={reportData.reportSummary.timestamp ? format(parseISO(reportData.reportSummary.timestamp), "M/d/yyyy, h:mm:ss a") : "N/A"} />
                  <InfoPair label="Performed By" value={reportData.reportSummary.performedBy ? `${reportData.reportSummary.performedBy.name} (ID: ${reportData.reportSummary.performedBy.userId})` : "N/A"} />
                  <InfoPair label="Ingest Utility Version" value={reportData.reportSummary.ingestUtilityVersion} />
                  <InfoPair label="Event" value={reportData.reportSummary.event?.name} />
                  <InfoPair label="Event ID (HIVE)" value={reportData.reportSummary.event?.id} />
                  <InfoPair label="Event Folder Hint" value={reportData.reportSummary.event?.folderHint} />
                  <InfoPair label="Photographer" value={reportData.reportSummary.photographer?.name} />
                  <InfoPair label="Photographer ID (HIVE)" value={reportData.reportSummary.photographer?.id} />
                  <InfoPair label="Photographer Initials" value={reportData.reportSummary.photographer?.initials} />
                </SectionCard>

                {/* --- Sources Section --- */}
                {reportData.sources && reportData.sources.length > 0 && (
                    <SectionCard title="Sources" icon={HardDrive} isEmpty={!reportData.sources || reportData.sources.length === 0}>
                        {reportData.sources.map((source, index) => (
                        <div key={source.id || index} className="border-b border-border/50 pb-2 mb-2 last:border-b-0 last:mb-0 print:border-0 print:pb-0 print:mb-0">
                            <InfoPair label={`Source ${index + 1}`} value={`${source.path} (Selected at: ${source.selectedAt ? format(parseISO(source.selectedAt), "h:mm:ss a") : "N/A"})`} />
                        </div>
                        ))}
                    </SectionCard>
                )}
                
                {/* --- Destinations Section --- */}
                <SectionCard title="Destinations" icon={FolderOpen} isEmpty={!reportData.destinations}>
                  <InfoPair label="Working Base" value={reportData.destinations?.workingBase} />
                  <InfoPair label="Effective Working" value={reportData.destinations?.effectiveWorking} />
                  <InfoPair label="Backup Base" value={reportData.destinations?.backupBase} />
                  <InfoPair label="Effective Backup" value={reportData.destinations?.effectiveBackup} />
                </SectionCard>

                {/* --- Phases Section --- */}
                <SectionCard title="Ingestion Phases" icon={Settings2} isEmpty={!reportData.phases || Object.keys(reportData.phases).length === 0}>
                    {reportData.phases?.merge && (
                        <div className="border-b border-border/50 pb-2 mb-2 print:border-0 print:pb-1 print:mb-1">
                            <h4 className="font-semibold text-sm print:text-sm">Merge Phase</h4>
                            <InfoPair label="Status"><StatusBadge status={reportData.phases.merge.status} /></InfoPair>
                            <InfoPair label="Duration" value={reportData.phases.merge.duration || `${reportData.phases.merge.started ? format(parseISO(reportData.phases.merge.started), "h:mm:ss a") : "N/A"} - ${reportData.phases.merge.ended ? format(parseISO(reportData.phases.merge.ended), "h:mm:ss a") : "N/A"}`} />
                            <InfoPair label="Files Merged" value={reportData.phases.merge.filesMerged} />
                            <InfoPair label="Total Bytes" value={formatBytes(reportData.phases.merge.totalBytes)} />
                            <InfoPair label="Temp Path" value={reportData.phases.merge.tempPath} />
                        </div>
                    )}
                    {reportData.phases?.copy && (
                        <div className="border-b border-border/50 pb-2 mb-2 print:border-0 print:pb-1 print:mb-1">
                            <h4 className="font-semibold text-sm print:text-sm">Copy Phase</h4>
                            <InfoPair label="Status"><StatusBadge status={reportData.phases.copy.status} /></InfoPair>
                            <InfoPair label="Duration" value={reportData.phases.copy.duration || `${reportData.phases.copy.started ? format(parseISO(reportData.phases.copy.started), "h:mm:ss a") : "N/A"} - ${reportData.phases.copy.ended ? format(parseISO(reportData.phases.copy.ended), "h:mm:ss a") : "N/A"}`} />
                            <InfoPair label="Files Copied" value={reportData.phases.copy.filesCopied} />
                            <InfoPair label="Bytes Copied" value={formatBytes(reportData.phases.copy.bytesCopied)} />
                            <InfoPair label="Working Copy Status"><StatusBadge status={reportData.phases.copy.workingStatus} /></InfoPair>
                            <InfoPair label="Backup Copy Status"><StatusBadge status={reportData.phases.copy.backupStatus} /></InfoPair>
                        </div>
                    )}
                    {reportData.phases?.checksum && (
                        <div className="print:border-0 print:pb-1 print:mb-1">
                            <h4 className="font-semibold text-sm print:text-sm">Checksum Phase</h4>
                            <InfoPair label="Status"><StatusBadge status={reportData.phases.checksum.status} /></InfoPair>
                            <InfoPair label="Duration" value={reportData.phases.checksum.duration || `${reportData.phases.checksum.started ? format(parseISO(reportData.phases.checksum.started), "h:mm:ss a") : "N/A"} - ${reportData.phases.checksum.ended ? format(parseISO(reportData.phases.checksum.ended), "h:mm:ss a") : "N/A"}`} />
                            <InfoPair label="Algorithm" value={reportData.phases.checksum.algorithm} />
                            <InfoPair label="Temp Hash" value={reportData.phases.checksum.tempHash} />
                            <InfoPair label="Working Hash" value={reportData.phases.checksum.workingHash} />
                            <InfoPair label="Matches Working"><StatusBadge status={reportData.phases.checksum.matchesWorking} /></InfoPair>
                            <InfoPair label="Backup Hash" value={reportData.phases.checksum.backupHash} />
                            <InfoPair label="Matches Backup"><StatusBadge status={reportData.phases.checksum.matchesBackup} /></InfoPair>
                        </div>
                    )}
                </SectionCard>

                {/* --- File Details Section --- */}
                <SectionCard title="File Details" icon={FileText} isEmpty={!reportData.fileDetails || reportData.fileDetails.length === 0}>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[40%]">Name</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Checksum (Truncated)</TableHead>
                        <TableHead>Reason (if Excluded)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(reportData.fileDetails || []).map((file, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-mono max-w-xs truncate print:max-w-none print:truncate-none" title={file.name}>{file.name}</TableCell>
                            <TableCell className="text-right font-mono">{formatBytes(file.size)}</TableCell>
                            <TableCell><StatusBadge status={file.status} /></TableCell>
                            <TableCell className="font-mono max-w-[100px] truncate print:max-w-none print:truncate-none" title={file.checksum}>{file.checksum ? `${file.checksum.substring(0, 10)}...` : "N/A"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate print:max-w-none print:truncate-none" title={file.reason}>{file.reason || "N/A"}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </SectionCard>

                {/* --- Overall Summary Section --- */}
                <SectionCard title="Overall Summary" icon={CheckCircle} isEmpty={!reportData.overallSummary}>
                  <InfoPair label="Total Files Attempted" value={reportData.overallSummary?.totalFilesAttempted} />
                  <InfoPair label="Total Files Ingested" value={reportData.overallSummary?.totalFilesIngested} />
                  <InfoPair label="Total Bytes Ingested" value={formatBytes(reportData.overallSummary?.totalBytesIngested)} />
                  <InfoPair label="Overall Status"> <StatusBadge status={reportData.overallSummary?.overallStatus} /> </InfoPair>
                  <InfoPair label="Excluded Files">
                    {reportData.overallSummary?.excludedFiles && reportData.overallSummary.excludedFiles.length > 0 ? (
                      <ul className="list-disc list-inside mt-1">
                        {reportData.overallSummary.excludedFiles.map((file, index) => (
                          <li key={index} className="text-xs">
                            <span className="font-mono">{file.name}</span> - <span className="italic">{file.reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="italic text-muted-foreground/70">None</span>
                    )}
                  </InfoPair>
                  <InfoPair label="Notes">
                    {reportData.overallSummary?.notes && reportData.overallSummary.notes.length > 0 ? (
                      <ul className="list-disc list-inside mt-1">
                        {reportData.overallSummary.notes.map((note, index) => (
                          <li key={index} className="text-xs">{note}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="italic text-muted-foreground/70">None</span>
                    )}
                  </InfoPair>
                </SectionCard>

                {/* --- Environment & Security (Optional Sections) --- */}
                 <SectionCard title="Environment" icon={Laptop} isEmpty={!reportData.environment || Object.keys(reportData.environment).length === 0}>
                  <InfoPair label="Ingest Utility Version" value={reportData.environment?.ingestUtilityVersion} />
                  <InfoPair label="Node Version" value={reportData.environment?.nodeVersion} />
                  <InfoPair label="Electron Version" value={reportData.environment?.electronVersion} />
                  <InfoPair label="OS Version" value={reportData.environment?.osVersion} />
                  <InfoPair label="Locale" value={reportData.environment?.locale} />
                  <InfoPair label="Network" value={reportData.environment?.network} />
                </SectionCard>

                <SectionCard title="Security" icon={ShieldCheck} isEmpty={!reportData.security}>
                  <InfoPair label="Encrypted"><StatusBadge status={reportData.security?.encrypted} /></InfoPair>
                  <InfoPair label="Algorithm" value={reportData.security?.algorithm} />
                  <InfoPair label="Overall Checksum" value={reportData.security?.checksum} />
                  <InfoPair label="Signed By" value={reportData.security?.signedBy} />
                </SectionCard>

              </div>
            )}
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
            onClick={handlePrintReport}
            variant="accent"
            disabled={!reportData || isLoading}
          >
            <Download className="mr-2 h-4 w-4"/> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
