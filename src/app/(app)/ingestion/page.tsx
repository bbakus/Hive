
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, FolderInput, HardDrive, RefreshCw, HelpCircle, ScanLine, KeySquare } from 'lucide-react'; 
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo, type IngestJobRequest } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
// The LocalAgentStatusIndicator is now global in the header, no need to import/use it here separately
// unless a secondary, page-specific indicator is desired.

export default function IngestionUtilityPage() {
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const {
    eventsForSelectedProjectAndOrg,
    isLoadingEvents,
    getEventById,
    updateShotRequest,
    getShotRequestsForEvent,
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [ingestionJobs, setIngestionJobs] = useState<IngestJobStatus[]>([]);
  const [hiveActivityLog, setHiveActivityLog] = useState<string[]>([]);

  const logHiveActivity = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'LOG: ';
    setHiveActivityLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const getPersonnelName = useCallback((personnelId?: string) => {
    if (!personnelId) return "Unknown";
    return initialPersonnelMock.find(p => p.id === personnelId)?.name || "Unknown";
  }, []);

  const getEventName = useCallback((eventId?: string) => {
    if (!eventId) return "Unknown";
    return eventsForSelectedProjectAndOrg.find(e => e.id === eventId)?.name || "Unknown Event";
  }, [eventsForSelectedProjectAndOrg]);

  const processJobCompletions = useCallback((jobs: IngestJobStatus[]) => {
    let shotsUpdatedCount = 0;
    const updatedJobs = jobs.map(job => {
      if (job.status === 'completed' && !job.hiveProcessedCompletion && job.determinedEventId && job.determinedPhotographerId) {
        const shotsToUpdateCount = job.filesMatchedToEvents ?? job.filesProcessed ?? 0;
        if (shotsToUpdateCount > 0) {
          const shotsForEvent = getShotRequestsForEvent(job.determinedEventId);
          const unassignedOrAssignedShots = shotsForEvent.filter(s => s.status === "Unassigned" || s.status === "Assigned");
          let actualShotsUpdatedInHIVE = 0;

          for (let i = 0; i < Math.min(shotsToUpdateCount, unassignedOrAssignedShots.length); i++) {
            const shotToUpdate = unassignedOrAssignedShots[i];
            updateShotRequest(job.determinedEventId, shotToUpdate.id, {
              status: 'Captured',
              initialCapturerId: job.determinedPhotographerId,
              lastStatusModifierId: job.determinedPhotographerId,
              lastStatusModifiedAt: new Date().toISOString(),
            });
            actualShotsUpdatedInHIVE++;
          }
          if (actualShotsUpdatedInHIVE > 0) {
            shotsUpdatedCount += actualShotsUpdatedInHIVE;
            logHiveActivity(`HIVE updated ${actualShotsUpdatedInHIVE} shot request(s) to 'Captured' for event ${getEventName(job.determinedEventId)} based on completed Job ID: ${job.jobId}.`, 'success');
          }
        }
        return { ...job, hiveProcessedCompletion: true };
      }
      return job;
    });
    if (shotsUpdatedCount > 0) {
      toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCount} shot(s) marked 'Captured' based on completed ingest jobs.`});
    }
    return updatedJobs;
  }, [getShotRequestsForEvent, updateShotRequest, logHiveActivity, toast, getEventName]);


  const handleFetchIngestionJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    logHiveActivity("Fetching ingestion job data from HIVE backend...");
    try {
      const fetchedJobs = await localUtility.getIngestionJobsFromHIVE();
      logHiveActivity(`Successfully fetched ${fetchedJobs.length} job(s). Processing completions...`, 'success');
      const processedJobs = processJobCompletions(fetchedJobs);
      setIngestionJobs(processedJobs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logHiveActivity(`Error fetching ingestion jobs: ${errorMessage}`, 'error');
      toast({ title: "Failed to Fetch Jobs", description: errorMessage, variant: "destructive" });
      setIngestionJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [logHiveActivity, toast, processJobCompletions]);
  
  useEffect(() => {
    if (!isLoadingSettings) {
      // Always attempt to fetch jobs from the API, regardless of demo data setting.
      // The API route /api/ingest-jobs itself will provide data (currently mock).
      handleFetchIngestionJobs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingSettings]); // Re-run when settings are loaded.
  
  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects;
  
  if (isLoadingContexts) {
    return <div className="p-4">Loading HIVE context...</div>;
  }
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Ingestion Job Monitor
        </h1>
        {/* The LocalAgentStatusIndicator is now globally available in the app header */}
      </div>
      
      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Use your **Local Desktop Ingestion Utility** to select media, destinations, and start the ingestion process. The utility will analyze media to determine Photographer and Event context (querying HIVE APIs or prompting you if needed).</p>
            <p>2. The Local Utility performs file operations (copying, checksums, folder creation) and **pushes status updates to HIVE's backend API**.</p>
            <p>3. This HIVE page displays a list of all jobs reported by local utilities. Click **"Refresh Ingestion Data"** to see the latest status.</p>
            <p>4. Upon detecting completed jobs, HIVE will attempt to update relevant shot request statuses to "Captured".</p>
        </AlertDescription>
      </Alert>

      <div className="flex justify-start">
        <Button onClick={handleFetchIngestionJobs} variant="outline" disabled={isLoadingJobs}>
          {isLoadingJobs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isLoadingJobs ? "Fetching Jobs..." : "Refresh Ingestion Data"}
        </Button>
      </div>

      <Card className="border-0">
        <CardHeader>
          <CardTitle>Reported Ingestion Jobs</CardTitle>
          <CardDescription>List of ingestion jobs as reported by local utilities to HIVE.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingJobs && <p className="text-muted-foreground text-center py-4">Loading ingestion jobs...</p>}
          {!isLoadingJobs && ingestionJobs.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No ingestion jobs reported yet. {useDemoData ? "Ensure your local utility is sending data to HIVE, or check mock API data." : "Have your local utility report jobs to HIVE, or enable demo data if you want to see sample jobs."}
            </p>
          )}
          {!isLoadingJobs && ingestionJobs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Photographer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Size (MB)</TableHead>
                  <TableHead>Checksum</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingestionJobs.map(job => (
                  <TableRow key={job.jobId}>
                    <TableCell className="text-xs font-mono" title={job.jobId}>{job.jobId.substring(0, 15)}...</TableCell>
                    <TableCell>
                      <Badge variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'failed' || job.status === 'cancelled' ? 'destructive' :
                        'secondary'
                      }>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{getPersonnelName(job.determinedPhotographerId)}</TableCell>
                    <TableCell className="text-xs">{getEventName(job.determinedEventId)}</TableCell>
                    <TableCell className="text-xs text-center">{job.progress ?? 'N/A'}%</TableCell>
                    <TableCell className="text-xs text-center">{job.filesProcessed ?? job.filesMatchedToEvents ?? 'N/A'} / {job.totalFiles ?? 'N/A'}</TableCell>
                    <TableCell className="text-xs text-center">{job.totalSizeMB?.toFixed(1) ?? 'N/A'}</TableCell>
                    <TableCell className="text-xs">
                       <Badge variant={
                           job.checksumResult === 'passed' || job.checksumResult === 'verified' ? 'default' :
                           job.checksumResult === 'failed' ? 'destructive' :
                           job.checksumResult === 'pending' || job.checksumResult === 'not_run' ? 'outline' :
                           'secondary' // for any other state
                       }>{job.checksumResult || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={job.message}>{job.message || 'N/A'}</TableCell>
                    <TableCell>
                      {job.reportUrl ? (
                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs">
                          <a href={job.reportUrl} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {(hiveActivityLog.length > 0) && (
        <Card className="border-0">
          <CardHeader>
            <p className="text-lg font-semibold">HIVE Activity Log</p>
            <CardDescription>Log of HIVE's actions related to ingestion jobs (e.g., fetching data, processing completions).</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={hiveActivityLog.join('\n')}
              className="h-40 font-mono text-xs bg-muted/30"
              placeholder="No HIVE activity logged yet..."
            />
          </CardContent>
        </Card>
      )}
      
       <Alert variant="destructive" className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page monitors ingestion jobs. The actual file selection, copying, EXIF parsing, and folder creation are performed by a **separate local desktop agent application** running on a user's computer. That agent is responsible for sending status updates and reports to HIVE's backend API. HIVE then displays this information.
        </AlertDescription>
      </Alert>
    </div>
  );
}
