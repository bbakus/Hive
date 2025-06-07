
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, FolderInput, HardDrive, RefreshCw, HelpCircle, ScanLine, KeySquare } from 'lucide-react'; 
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
// Import usePersonnelContext from the new context
import { usePersonnelContext, type Personnel } from '@/contexts/PersonnelContext';
// Removed import of initialPersonnelMock from personnel/page
// import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo, type IngestJobRequest } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { default_api } from '@/lib/utils';

// The LocalAgentStatusIndicator is now global in the header, no need to import/use it here separately
// unless a secondary, page-specific indicator is desired.

export default function IngestionUtilityPage() {
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const { allEvents, isLoadingEvents, getShotRequestsForEvent, updateShotRequest, getEventById } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  // Use the personnel context
  const { personnelList, isLoadingPersonnel } = usePersonnelContext();
  const { toast } = useToast();

  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [ingestionJobs, setIngestionJobs] = useState<IngestJobStatus[]>([]);
  const [hiveActivityLog, setHiveActivityLog] = useState<string[]>([]);

  const logHiveActivity = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'LOG: ';
    setHiveActivityLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const getPersonnelName = useCallback((personnelId?: string) => {
    if (!personnelId || !personnelList) return "Unknown";
    // Use personnelList from context
    return personnelList.find(p => p.id === personnelId)?.name || "Unknown";
  }, [personnelList]); // Depend on personnelList from context

  const getEventName = useCallback((eventId?: string) => {
    if (!eventId || !allEvents) return "Unknown Event"; // TODO: Add a more specific type if known
    return allEvents.find(e => e.id === eventId)?.name || "Unknown Event";
  }, [allEvents]); // Depend on allEvents from EventContext

  const processJobCompletions = useCallback((jobs: IngestJobStatus[]) => {
    let shotsUpdatedCount = 0;
    // Add a flag to jobs to prevent re-processing completion on re-renders if not already done
    const jobsToProcess = jobs.filter(job => job.status === 'completed' && !job.hiveProcessedCompletion && job.determinedEventId && job.determinedPhotographerId);

    const processedJobs = jobs.map(job => {
        if (job.status === 'completed' && !job.hiveProcessedCompletion && job.determinedEventId && job.determinedPhotographerId) {
            const shotsToUpdateCount = (job.filesMatchedToEvents ?? job.filesProcessed ?? 0);
            if (shotsToUpdateCount > 0) {
                const shotsForEvent = getShotRequestsForEvent(job.determinedEventId);
                const unassignedOrAssignedShots = shotsForEvent.filter(s => s.status === "Unassigned" || s.status === "Assigned");
                let actualShotsUpdatedInHIVE = 0;

                for (let i = 0; i < Math.min(shotsToUpdateCount, unassignedOrAssignedShots.length); i++) {
                    const shotToUpdate = unassignedOrAssignedShots[i];
                    // Only update if the shot hasn't already been marked as captured by this or another job, and if updateShotRequest is available
                    if (shotToUpdate.status !== 'Captured' && shotToUpdate.status !== 'Completed') {
                        updateShotRequest(job.determinedEventId, shotToUpdate.id, {
                            status: 'Captured',
                            initialCapturerId: job.determinedPhotographerId,
                            lastStatusModifierId: job.determinedPhotographerId,
                            lastStatusModifiedAt: new Date().toISOString(),
                        });
                        actualShotsUpdatedInHIVE++;
                    }
                }
                if (actualShotsUpdatedInHIVE > 0) {
                    shotsUpdatedCount += actualShotsUpdatedInHIVE;
                    logHiveActivity(`HIVE updated ${actualShotsUpdatedInHIVE} shot request(s) to 'Captured' for event ${getEventName(job.determinedEventId)} based on completed Job ID: ${job.jobId}.`, 'success');
                }
            }
            // Mark as processed in HIVE state
            return { ...job, hiveProcessedCompletion: true };
        }
        return job;
    });

    if (shotsUpdatedCount > 0) {
      toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCount} shot(s) marked 'Captured' based on completed ingest jobs.`});
    } 
    // Return all jobs, including those not just processed, but with the flag potentially updated
    return processedJobs;

  }, [getShotRequestsForEvent, updateShotRequest, logHiveActivity, toast, getEventName]);

  const fetchIngestionJobs = useCallback(async () => {
      // Wait for all necessary contexts to load
      if (isLoadingSettings || isLoadingEvents || isLoadingProjects || isLoadingPersonnel) return; 

      setIsLoadingJobs(true);
      let fetchedJobs: IngestJobStatus[] = [];

      if (useDemoData) {
          logHiveActivity("Loading ingestion job data from demo file...");
          try {
            const response = await default_api.read_file({ path: "public/demo/demo_data.json" });
            if (response.status === 'succeeded') {
              const demoData = JSON.parse(response.result);
              if (demoData && Array.isArray(demoData.ingestionJobs)) {
                // Map demo data structure to IngestJobStatus type
                fetchedJobs = demoData.ingestionJobs.map((job: any) => ({
                   jobId: job.jobId.toString(), // Ensure jobId is a string
                   status: job.status, // Assuming status exists
                   progress: job.progress, // Assuming progress exists
                   message: job.message,
                   filesProcessed: job.filesProcessed, // Assuming filesProcessed exists
                   filesMatchedToEvents: job.filesMatchedToEvents, // Assuming filesMatchedToEvents exists
                   filesUnmatched: job.filesUnmatched, // Assuming filesUnmatched exists
                   totalFiles: job.totalFiles, // Assuming totalFiles exists
                   totalSizeMB: job.totalSizeMB, // Assuming totalSizeMB exists
                   checksumResult: job.checksumResult, // Assuming checksumResult exists
                   errors: job.errors || [], // Ensure errors is an array
                   determinedPhotographerId: job.determinedPhotographerId, // Assuming ID exists
                   determinedEventId: job.determinedEventId, // Assuming ID exists
                   reportUrl: job.reportUrl, // Assuming reportUrl exists
                   timestamp: job.timestamp || new Date().toISOString(), // Add a timestamp if missing
                   hiveProcessedCompletion: false, // Initialize processing flag
                }));
                 logHiveActivity(`Successfully loaded ${fetchedJobs.length} demo job(s).`, 'success');
              } else {
                 console.error("Demo data file does not contain an 'ingestionJobs' array or is empty.");
                 logHiveActivity("Demo data file does not contain an 'ingestionJobs' array or is empty.", 'error');
              }
            } else {
              console.error("Failed to read demo data file:", response.error);
               logHiveActivity(`Failed to read demo data file: ${response.error}`, 'error');
            }
          } catch (error) {
            console.error("Error processing demo data JSON for ingestion jobs:", error);
             logHiveActivity(`Error processing demo data JSON for ingestion jobs: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
      } else {
        // Fetch live data from the actual backend API
        logHiveActivity("Fetching ingestion job data from HIVE backend...");
        try {
           // This should call your actual backend API to get live jobs
          const liveJobs = await localUtility.getIngestionJobsFromHIVE(); // Assuming this utility function hits your real API proxy
           logHiveActivity(`Successfully fetched ${liveJobs.length} live job(s).`, 'success');
           fetchedJobs = liveJobs.map(job => ({...job, hiveProcessedCompletion: false})); // Initialize flag for live jobs
        } catch (error) {
           const errorMessage = error instanceof Error ? error.message : String(error);
           logHiveActivity(`Error fetching live ingestion jobs: ${errorMessage}`, 'error');
           toast({ title: "Failed to Fetch Live Jobs", description: errorMessage, variant: "destructive" });
        }
      }
      
      // Process newly fetched jobs (either demo or live) for completions
      const processedJobs = processJobCompletions(fetchedJobs);
      setIngestionJobs(processedJobs);
    setIsLoadingJobs(false);
  }, [useDemoData, isLoadingSettings, isLoadingEvents, isLoadingProjects, isLoadingPersonnel, logHiveActivity, processJobCompletions, toast]); // Added isLoadingPersonnel to dependencies
  
  // Initial data load effect
  useEffect(() => {
    // Only fetch if contexts are not loading
    if (!isLoadingSettings && !isLoadingEvents && !isLoadingProjects && !isLoadingPersonnel) {
        fetchIngestionJobs();
    }
  // Re-run effect if useDemoData or context loading states change
  }, [fetchIngestionJobs, isLoadingSettings, isLoadingEvents, isLoadingProjects, isLoadingPersonnel]); // Added isLoadingPersonnel to dependencies
  

  // Use isLoadingPersonnel from context
  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects || isLoadingPersonnel;

  // Refetch jobs periodically if needed (optional, but common for monitoring pages)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //      if (!isLoadingJobs && !isLoadingContexts) { // Avoid fetching if already loading or contexts are loading
  //         fetchIngestionJobs();
  //      }
  //   }, 30000); // Refresh every 30 seconds
  //   return () => clearInterval(interval);
  // }, [fetchIngestionJobs, isLoadingJobs, isLoadingContexts]);


  
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
             {useDemoData && <p className="text-yellow-700 font-medium">NOTE: You are currently viewing **demo ingestion job data** loaded from a local file (`public/demo/demo_data.json`). To see live jobs, disable "Load Demo Data" in settings (if implemented).</p>}
        </AlertDescription>
      </Alert>

      <div className="flex justify-start">
        <Button onClick={fetchIngestionJobs} variant="outline" disabled={isLoadingJobs || isLoadingContexts}>
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
                          {/* Report URL needs to be accessible. If local file, might need special handling or a local server endpoint. */}
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
            <CardDescription>Log of HIVE's actions related to ingestion jobs (e.g., fetching data, processing completions).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly={true}
              value={hiveActivityLog.join('
')}
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
