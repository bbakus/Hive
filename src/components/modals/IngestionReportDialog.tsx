
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
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Download, CheckCircle, XCircle, Info, FileText, Server, Users, HardDrive, ShieldCheck, Settings2, FolderOpen, UserCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// --- Report Data Structure Interfaces ---
interface ReportUser {
  userId: string;
  name: string;
}
interface ReportEvent {
  id: string;
  name: string;
  folderHint: string;
}
interface ReportPhotographer {
  id: string;
  name: string;
  initials: string;
}
interface ReportSummaryInfo {
  id: string;
  timestamp: string;
  performedBy: ReportUser;
  appVersion: string;
  event: ReportEvent;
  photographer: ReportPhotographer;
}
interface ReportSource {
  id: string;
  path: string;
  selectedAt: string;
}
interface ReportDestinations {
  workingBase: string;
  effectiveWorking: string;
  backupBase: string;
  effectiveBackup: string;
}
interface ReportPhase {
  started: string;
  ended: string;
  status: string;
  [key: string]: any; // for other phase-specific fields
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
  swiftVersion?: string;
  ingestionManagerVersion?: string;
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
  sources: ReportSource[];
  destinations: ReportDestinations;
  phases: ReportPhases;
  fileDetails: ReportFileDetail[];
  overallSummary: ReportOverallSummary;
  environment: ReportEnvironment;
  security: ReportSecurity;
}

// --- Helper Components & Functions ---
const SectionCard: React.FC<{ title: string; icon?: React.ElementType; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
  <div className={cn("border rounded-none p-4 mb-4 bg-card", className)}>
    <h3 className="text-md font-semibold mb-3 flex items-center">
      {Icon && <Icon className="mr-2 h-5 w-5 text-accent" />}
      {title}
    </h3>
    <div className="space-y-2 text-xs">{children}</div>
  </div>
);

const InfoPair: React.FC<{ label: string; value?: string | number | boolean | null; className?: string; children?: React.ReactNode }> = ({ label, value, className, children }) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-start", className)}>
    <p className="font-medium text-muted-foreground sm:w-1/3">{label}:</p>
    {children ? <div className="sm:w-2/3">{children}</div> : <p className="sm:w-2/3 break-words">{value === undefined || value === null ? <span className="italic text-muted-foreground/70">N/A</span> : String(value)}</p>}
  </div>
);

const formatBytes = (bytes?: number, decimals = 2) => {
  if (bytes === undefined || bytes === null) return 'N/A Bytes';
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
  if (status === null || status === undefined) text = "N/A";


  if (["success", "verified", "passed", "true", "yes", "ingested"].includes(text)) variant = "default"; // Green-ish in ShadCN (depends on theme's "default" if it's primary or accent)
  else if (["failed", "error", "no", "excluded"].includes(text)) variant = "destructive";
  else if (["processing", "pending", "copying", "checksumming"].includes(text)) variant = "secondary";
  
  const successClass = (variant === "default") ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" : "";

  return <Badge variant={variant} className={cn("capitalize text-xs", successClass)}>{String(status)}</Badge>;
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
            throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}. ${errorText}`);
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
    }
  }, [isOpen, reportUrl]);

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col print:h-auto print:max-w-full print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Ingestion Report Details</DialogTitle>
          <DialogDescription>
            Report ID: {reportData?.reportSummary?.id || "Loading..."} (From: {reportUrl})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-2 pr-0 print:overflow-visible print:pr-0">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Loading report...</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Report</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {reportData && !isLoading && (
            <div className="space-y-3 p-1">
              <SectionCard title="Report Summary" icon={FileText}>
                <InfoPair label="Report ID" value={reportData.reportSummary.id} />
                <InfoPair label="Timestamp" value={new Date(reportData.reportSummary.timestamp).toLocaleString()} />
                <InfoPair label="Performed By" value={`${reportData.reportSummary.performedBy.name} (ID: ${reportData.reportSummary.performedBy.userId})`} />
                <InfoPair label="App Version" value={reportData.reportSummary.appVersion} />
                <InfoPair label="Event" value={reportData.reportSummary.event.name} />
                <InfoPair label="Event ID (HIVE)" value={reportData.reportSummary.event.id} />
                <InfoPair label="Event Folder Hint" value={reportData.reportSummary.event.folderHint} icon={FolderOpen} />
                <InfoPair label="Photographer" value={reportData.reportSummary.photographer.name} />
                <InfoPair label="Photographer ID (HIVE)" value={reportData.reportSummary.photographer.id} />
                <InfoPair label="Photographer Initials" value={reportData.reportSummary.photographer.initials} icon={UserCircle} />
              </SectionCard>

              <SectionCard title="Sources" icon={Server}>
                {reportData.sources.map(source => (
                  <InfoPair key={source.id} label={source.id} value={`${source.path} (Selected at: ${new Date(source.selectedAt).toLocaleTimeString()})`} />
                ))}
              </SectionCard>

              <SectionCard title="Destinations" icon={HardDrive}>
                <InfoPair label="Working Base" value={reportData.destinations.workingBase} />
                <InfoPair label="Effective Working" value={reportData.destinations.effectiveWorking} />
                <InfoPair label="Backup Base" value={reportData.destinations.backupBase} />
                <InfoPair label="Effective Backup" value={reportData.destinations.effectiveBackup} />
              </SectionCard>
              
              <SectionCard title="Ingestion Phases" icon={Settings2}>
                {reportData.phases.merge && (
                  <div className="border-b pb-2 mb-2">
                    <h4 className="font-medium text-sm mb-1">Merge Phase</h4>
                    <InfoPair label="Status"><StatusBadge status={reportData.phases.merge.status} /></InfoPair>
                    <InfoPair label="Duration" value={`${new Date(reportData.phases.merge.started).toLocaleTimeString()} - ${new Date(reportData.phases.merge.ended).toLocaleTimeString()}`} />
                    <InfoPair label="Files Merged" value={reportData.phases.merge.filesMerged} />
                    <InfoPair label="Total Bytes" value={formatBytes(reportData.phases.merge.totalBytes)} />
                    <InfoPair label="Temp Path" value={reportData.phases.merge.tempPath} />
                  </div>
                )}
                {reportData.phases.copy && (
                   <div className="border-b pb-2 mb-2">
                    <h4 className="font-medium text-sm mb-1">Copy Phase</h4>
                     <InfoPair label="Status"><StatusBadge status={reportData.phases.copy.status} /></InfoPair>
                    <InfoPair label="Duration" value={`${new Date(reportData.phases.copy.started).toLocaleTimeString()} - ${new Date(reportData.phases.copy.ended).toLocaleTimeString()}`} />
                    <InfoPair label="Files Copied" value={reportData.phases.copy.filesCopied} />
                    <InfoPair label="Bytes Copied" value={formatBytes(reportData.phases.copy.bytesCopied)} />
                    <InfoPair label="Working Status"><StatusBadge status={reportData.phases.copy.workingStatus} /></InfoPair>
                    <InfoPair label="Backup Status"><StatusBadge status={reportData.phases.copy.backupStatus} /></InfoPair>
                  </div>
                )}
                {reportData.phases.checksum && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Checksum Phase</h4>
                    <InfoPair label="Status"><StatusBadge status={reportData.phases.checksum.status || (reportData.phases.checksum.matchesWorking && reportData.phases.checksum.matchesBackup ? "Passed" : "Failed")} /></InfoPair>
                    <InfoPair label="Duration" value={`${new Date(reportData.phases.checksum.started).toLocaleTimeString()} - ${new Date(reportData.phases.checksum.ended).toLocaleTimeString()}`} />
                    <InfoPair label="Algorithm" value={reportData.phases.checksum.algorithm} />
                    <InfoPair label="Temp Hash" value={reportData.phases.checksum.tempHash} />
                    <InfoPair label="Working Hash" value={reportData.phases.checksum.workingHash} />
                    <InfoPair label="Backup Hash" value={reportData.phases.checksum.backupHash} />
                    <InfoPair label="Working Match"><StatusBadge status={reportData.phases.checksum.matchesWorking} /></InfoPair>
                    <InfoPair label="Backup Match"><StatusBadge status={reportData.phases.checksum.matchesBackup} /></InfoPair>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="File Details" icon={FileText}>
                <div className="max-h-96 overflow-y-auto border rounded-none">
                  <Table className="text-xs">
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="p-1.5">Filename</TableHead>
                        <TableHead className="p-1.5 text-right">Size</TableHead>
                        <TableHead className="p-1.5">Status</TableHead>
                        <TableHead className="p-1.5">Checksum</TableHead>
                        <TableHead className="p-1.5">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.fileDetails.map((file, index) => (
                        <TableRow key={index}>
                          <TableCell className="p-1.5 font-mono truncate max-w-xs" title={file.name}>{file.name}</TableCell>
                          <TableCell className="p-1.5 text-right font-mono">{formatBytes(file.size)}</TableCell>
                          <TableCell className="p-1.5"><StatusBadge status={file.status} /></TableCell>
                          <TableCell className="p-1.5 font-mono truncate max-w-[100px]" title={file.checksum}>{file.checksum || "N/A"}</TableCell>
                          <TableCell className="p-1.5 truncate max-w-xs" title={file.reason}>{file.reason || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                       {reportData.fileDetails.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground p-3">No individual file details provided.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>

              <SectionCard title="Overall Summary" icon={CheckCircle}>
                <InfoPair label="Overall Status"><StatusBadge status={reportData.overallSummary.overallStatus} /></InfoPair>
                <InfoPair label="Files Attempted" value={reportData.overallSummary.totalFilesAttempted} />
                <InfoPair label="Files Ingested" value={reportData.overallSummary.totalFilesIngested} />
                <InfoPair label="Bytes Ingested" value={formatBytes(reportData.overallSummary.totalBytesIngested)} />
                 {reportData.overallSummary.excludedFiles.length > 0 && (
                   <InfoPair label="Excluded Files">
                      <ul className="list-disc list-inside">
                        {reportData.overallSummary.excludedFiles.map(ef => (
                            <li key={ef.name}>{ef.name} <span className="text-muted-foreground/80">({ef.reason})</span></li>
                        ))}
                      </ul>
                   </InfoPair>
                 )}
                <InfoPair label="Notes">
                    {reportData.overallSummary.notes.length > 0 ? (
                        <ul className="list-disc list-inside">{reportData.overallSummary.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
                    ) : (<span className="italic text-muted-foreground/70">None</span>) }
                </InfoPair>
              </SectionCard>

              <div className="grid md:grid-cols-2 gap-3">
                <SectionCard title="Environment" icon={Server}>
                  <InfoPair label="Swift Version" value={reportData.environment.swiftVersion} />
                  <InfoPair label="Ingestion Manager" value={reportData.environment.ingestionManagerVersion} />
                  <InfoPair label="Locale" value={reportData.environment.locale} />
                  <InfoPair label="Network" value={reportData.environment.network} />
                </SectionCard>
                <SectionCard title="Security" icon={ShieldCheck}>
                  <InfoPair label="Encrypted"><StatusBadge status={reportData.security.encrypted} /></InfoPair>
                  <InfoPair label="Algorithm" value={reportData.security.algorithm} />
                  <InfoPair label="Checksum" value={reportData.security.checksum} />
                  <InfoPair label="Signed By" value={reportData.security.signedBy} />
                </SectionCard>
              </div>
            </div>
          )}
        </ScrollArea>
        <Alert variant="default" className="mt-2 print:hidden">
          <Info className="h-4 w-4" />
          <AlertTitle>PDF Export Note</AlertTitle>
          <AlertDescription className="text-xs">
            The "Download PDF" button will use your browser's print functionality. Choose "Save as PDF" or "Print to PDF" as the destination in the print dialog.
          </AlertDescription>
        </Alert>
        <DialogFooter className="mt-auto pt-4 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownloadPdf} variant="accent" disabled={!reportData || isLoading}>
            <Download className="mr-2 h-4 w-4"/> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

