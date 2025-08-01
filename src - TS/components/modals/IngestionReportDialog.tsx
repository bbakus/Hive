
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import React, { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, Download, CheckCircle, XCircle, Info, FileText, Server, Users, HardDrive, ShieldCheck, Settings2, FolderOpen, UserCircle, PowerSquare, Binary, Laptop, CalendarClock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../../lib/utils";
import { Icons } from "../icons";
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
  <div className={cn("section-card-print", className)}>
    <h3 className="mb-3 flex items-center print:text-base print:mb-1">
      {Icon && <Icon className="mr-2 h-5 w-5 text-accent print:h-4 print:w-4" />}
      {title}
    </h3>
    {isEmpty ? <p className="text-muted-foreground italic print:text-xs">No data provided for this section.</p> : <div className="space-y-2 print:space-y-1">{children}</div>}
  </div>
);

const InfoPair: React.FC<{ label: string; value?: string | number | boolean | null; className?: string; children?: React.ReactNode }> = ({ label, value, className, children }) => (
  <div className={cn("info-pair-print flex flex-col sm:flex-row sm:items-start", className)}>
    <p className="font-medium text-muted-foreground sm:w-auto print:font-semibold print:text-black print:mr-1">{label}:</p>
    {children ? <div className="sm:w-auto break-words print:inline">{children}</div> : <p className="sm:w-auto break-words print:inline">{value === undefined || value === null || String(value).trim() === "" ? <span className="italic text-muted-foreground/70">N/A</span> : String(value)}</p>}
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
  }
  
  const renderChecksumIcon = (value?: boolean | string | null) => {
    if (value === true || (typeof value === 'string' && value.trim() !== '')) return <CheckCircle className="h-4 w-4 icon-green print:text-black mx-auto" />;
    if (value === false || value === '' || value === null || value === undefined) return <XCircle className="h-4 w-4 icon-red print:text-black mx-auto" />;
    return <span className="italic text-muted-foreground/70 mx-auto">N/A</span>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col print:h-auto print:max-w-full print:border-0 print:shadow-none print:dialog-content-reset">
        <DialogHeader className="print:hidden">
          <DialogTitle>Ingestion Report Details</DialogTitle>
          <DialogDescription>
            Report ID: {isLoading ? "Loading..." : (reportData?.reportSummary?.id || "N/A")} (From: {reportUrl})
          </DialogDescription>
        </DialogHeader>

        <ScrollArea id="ingestion-report-content" className="flex-grow my-2 pr-0 print:overflow-visible print:pr-0 print:my-0">
            <div id="printable-dialog-header" className="hidden print:flex print:justify-between print:items-start print:pb-4 print:mb-6">
              <div className="title-block">
                <h2 className="title">Ingestion Report</h2>
                {reportData?.reportSummary?.id && <p className="subtitle">Report ID: {reportData.reportSummary.id}</p>}
              </div>
              {reportData?.reportSummary?.timestamp && <p className="timestamp">{format(parseISO(reportData.reportSummary.timestamp), "M/d/yy, p")}</p>}
            </div>


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
                
                <SectionCard title="Photographer Details" icon={UserCircle} isEmpty={!reportData.reportSummary.photographer}>
                    <InfoPair label="Photographer" value={reportData.reportSummary.photographer?.name} />
                    <InfoPair label="Photographer ID (HIVE)" value={reportData.reportSummary.photographer?.id} />
                    <InfoPair label="Photographer Initials" value={reportData.reportSummary.photographer?.initials} />
                </SectionCard>

                <SectionCard title="Report Summary" icon={Info} isEmpty={!reportData.reportSummary}>
                  <InfoPair label="Report ID" value={reportData.reportSummary.id} />
                  <InfoPair label="Timestamp" value={reportData.reportSummary.timestamp ? format(parseISO(reportData.reportSummary.timestamp), "M/d/yyyy, h:mm:ss a") : "N/A"} />
                  <InfoPair label="Performed By" value={reportData.reportSummary.performedBy ? `${reportData.reportSummary.performedBy.name} (ID: ${reportData.reportSummary.performedBy.userId})` : "N/A"} />
                  <InfoPair label="Ingest Utility Version" value={reportData.reportSummary.ingestUtilityVersion} />
                  <InfoPair label="Event" value={reportData.reportSummary.event?.name} />
                  <InfoPair label="Event ID (HIVE)" value={reportData.reportSummary.event?.id} />
                  <InfoPair label="Event Folder Hint" value={reportData.reportSummary.event?.folderHint} />
                </SectionCard>

                {reportData.sources && reportData.sources.length > 0 && (
                    <SectionCard title="Sources" icon={HardDrive} isEmpty={!reportData.sources || reportData.sources.length === 0}>
                        {reportData.sources.map((source, index) => (
                        <div key={source.id || index} className="print-phase-details-wrapper">
                            <InfoPair label={`Source ${index + 1}`} value={`${source.path} (Selected at: ${source.selectedAt ? format(parseISO(source.selectedAt), "h:mm:ss a") : "N/A"})`} />
                        </div>
                        ))}
                    </SectionCard>
                )}
                
                <SectionCard title="Destinations" icon={FolderOpen} isEmpty={!reportData.destinations}>
                  <InfoPair label="Working Base" value={reportData.destinations?.workingBase} />
                  <InfoPair label="Effective Working" value={reportData.destinations?.effectiveWorking} />
                  <InfoPair label="Backup Base" value={reportData.destinations?.backupBase} />
                  <InfoPair label="Effective Backup" value={reportData.destinations?.effectiveBackup} />
                </SectionCard>

                <SectionCard title="Ingestion Phases" icon={Settings2} isEmpty={!reportData.phases || Object.keys(reportData.phases).length === 0}>
                    {reportData.phases?.merge && (
                        <div className="print-phase-details-wrapper">
                            <h4 className="font-semibold text-sm print:text-sm">Merge Phase</h4>
                            <InfoPair label="Status"><StatusBadge status={reportData.phases.merge.status} /></InfoPair>
                            <InfoPair label="Duration" value={reportData.phases.merge.duration || `${reportData.phases.merge.started ? format(parseISO(reportData.phases.merge.started), "h:mm:ss a") : "N/A"} - ${reportData.phases.merge.ended ? format(parseISO(reportData.phases.merge.ended), "h:mm:ss a") : "N/A"}`} />
                            <InfoPair label="Files Merged" value={reportData.phases.merge.filesMerged} />
                            <InfoPair label="Total Bytes" value={formatBytes(reportData.phases.merge.totalBytes)} />
                            <InfoPair label="Temp Path" value={reportData.phases.merge.tempPath} />
                        </div>
                    )}
                    {reportData.phases?.copy && (
                        <div className="print-phase-details-wrapper">
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
                        <div className="print-phase-details-wrapper">
                            <h4 className="font-semibold text-sm print:text-sm">Checksum Phase</h4>
                            <InfoPair label="Status"><StatusBadge status={reportData.phases.checksum.status} /></InfoPair>
                            <InfoPair label="Duration" value={reportData.phases.checksum.duration || `${reportData.phases.checksum.started ? format(parseISO(reportData.phases.checksum.started), "h:mm:ss a") : "N/A"} - ${reportData.phases.checksum.ended ? format(parseISO(reportData.phases.checksum.ended), "h:mm:ss a") : "N/A"}`} />
                            <InfoPair label="Algorithm" value={reportData.phases.checksum.algorithm} />
                            <InfoPair label="Temp Hash" value={reportData.phases.checksum.tempHash} />
                            <InfoPair label="Working Hash" value={reportData.phases.checksum.workingHash} />
                            <InfoPair label="Matches Working">{renderChecksumIcon(reportData.phases.checksum.matchesWorking)}</InfoPair>
                            <InfoPair label="Backup Hash" value={reportData.phases.checksum.backupHash} />
                            <InfoPair label="Matches Backup">{renderChecksumIcon(reportData.phases.checksum.matchesBackup)}</InfoPair>
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Overall Summary" icon={CheckCircle} isEmpty={!reportData.overallSummary}>
                  <InfoPair label="Total Files Attempted" value={reportData.overallSummary?.totalFilesAttempted} />
                  <InfoPair label="Total Files Ingested" value={reportData.overallSummary?.totalFilesIngested} />
                  <InfoPair label="Total Bytes Ingested" value={formatBytes(reportData.overallSummary?.totalBytesIngested)} />
                  <InfoPair label="Overall Status"> <StatusBadge status={reportData.overallSummary?.overallStatus} /> </InfoPair>
                  <InfoPair label="Excluded Files">
                    {reportData.overallSummary?.excludedFiles && reportData.overallSummary.excludedFiles.length > 0 ? (
                      <ul className="list-disc list-inside mt-1">
                        {reportData.overallSummary.excludedFiles.map((file, index) => (
                          <li key={index}>
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
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="italic text-muted-foreground/70">None</span>
                    )}
                  </InfoPair>
                </SectionCard>

                 <SectionCard title="Environment" icon={Laptop} isEmpty={!reportData.environment || Object.keys(reportData.environment).length === 0}>
                  <InfoPair label="Ingest Utility Version" value={reportData.environment?.ingestUtilityVersion} />
                  <InfoPair label="Node Version" value={reportData.environment?.nodeVersion} />
                  <InfoPair label="Electron Version" value={reportData.environment?.electronVersion} />
                  <InfoPair label="OS Version" value={reportData.environment?.osVersion} />
                  <InfoPair label="Locale" value={reportData.environment?.locale} />
                  <InfoPair label="Network" value={reportData.environment?.network} />
                </SectionCard>

                <SectionCard title="Security" icon={ShieldCheck} isEmpty={!reportData.security}>
                  <InfoPair label="Encrypted">{renderChecksumIcon(reportData.security?.encrypted)}</InfoPair>
                  <InfoPair label="Algorithm" value={reportData.security?.algorithm} />
                  <InfoPair label="Overall Checksum" value={reportData.security?.checksum} />
                  <InfoPair label="Signed By" value={reportData.security?.signedBy} />
                </SectionCard>

                <SectionCard title="File Details" icon={FileText} isEmpty={!reportData.fileDetails || reportData.fileDetails.length === 0}>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className={cn("w-[25%] text-center", "report-table-cell-small-font")}>Name</TableHead>
                        <TableHead className={cn("w-[15%] text-center", "report-table-cell-small-font")}>Size</TableHead>
                        <TableHead className="w-[20%] text-center">Status</TableHead>
                        <TableHead className={cn("w-[15%] text-center", "report-table-cell-small-font")}>Checksum Calc.</TableHead>
                        <TableHead className="w-[25%] text-center">Reason (if Excluded)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(reportData.fileDetails || []).map((file, index) => (
                        <TableRow key={index}>
                            <TableCell className={cn("font-mono max-w-sm truncate print:max-w-none print:truncate-none", "report-table-cell-small-font")} title={file.name}>{file.name}</TableCell>
                            <TableCell className={cn("text-right font-mono", "report-table-cell-small-font")}>{formatBytes(file.size)}</TableCell>
                            <TableCell className="text-center">
                              {file.status.toLowerCase() === 'ingested' ? <CheckCircle className="h-4 w-4 icon-green print:text-black mx-auto" /> :
                               file.status.toLowerCase() === 'excluded' ? <XCircle className="h-4 w-4 icon-red print:text-black mx-auto" /> :
                               <StatusBadge status={file.status} />}
                            </TableCell>
                            <TableCell className={cn("font-mono text-center", "report-table-cell-small-font")}>
                                {renderChecksumIcon(file.checksum)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate print:max-w-none print:truncate-none" title={file.reason}>{file.reason || "N/A"}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
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

