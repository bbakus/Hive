
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, FolderInput, HardDrive, RefreshCw, HelpCircle, ScanLine, KeySquare } from 'lucide-react'; 
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo, type IngestJobRequest, type PhotographerInfoForAgent } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

export default function IngestionUtilityPage() {
  const { selectedProjectId, selectedProject, isLoadingProjects } = useProjectContext();
  const {
    eventsForSelectedProjectAndOrg,
    isLoadingEvents,
    getEventById,
    updateShotRequest,
    getShotRequestsForEvent,
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [ingestionJobs, setIngestionJobs] = useState<IngestJobStatus[]>([]);
  const [hiveActivityLog, setHiveActivityLog] = useState<string[]>([]);

  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [isLoadingAvailableDrives, setIsLoadingAvailableDrives] = useState(false);
  const [availablePaths, setAvailablePaths] = useState<DriveInfo[]>([]);

  const logHiveActivity = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'HIVE: ';
    setHiveActivityLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const getPersonnelName = useCallback((id?: string): string => {
    if (!id) return "N/A";
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : id;
  }, []);

  const getEventName = useCallback((id?: string): string => {
    if (!id) return "N/A";
    const event = getEventById(id); 
    return event ? event.name : id;
  }, [getEventById]);

  const verifyAgentConnection = useCallback(async (showToast = false) => {
    setAgentConnectionStatus('checking');
    logHiveActivity("Verifying HIVE connection to local agent (http://localhost:8765/available-drives)...");
    try {
      await localUtility.getAvailableDrives(); 
      setAgentConnectionStatus('connected');
      logHiveActivity("HIVE successfully connected to local agent.", 'success');
      if (showToast) {
        toast({
          title: "Local Agent Connected",
          description: "HIVE can communicate with the local ingestion agent.",
        });
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAgentConnectionStatus('disconnected');
      logHiveActivity(`HIVE failed to connect to local agent: ${errorMessage}`, 'error');

      let toastDescription = `Error: ${errorMessage}`;
       if (errorMessage.toLowerCase().includes("failed to fetch") ||
          errorMessage.toLowerCase().includes("networkerror") ||
          errorMessage.toLowerCase().includes("connection refused")) {
        toastDescription = "Could not reach local agent. Please ensure it's running on http://localhost:8765 and that CORS is correctly configured on the agent to allow requests from HIVE's origin.";
      } else if (errorMessage.includes("status: 404")) {
        toastDescription = "Connected to agent, but '/available-drives' endpoint not found (404). Check agent's API routes.";
      } else if (errorMessage.includes("status:")) {
        toastDescription = `Agent responded with an error: ${errorMessage}. Check agent logs.`;
      }
      if (showToast) {
        toast({
          title: "Agent Connection Failed",
          description: toastDescription,
          variant: "destructive",
          duration: 10000
        });
      }
      return false;
    }
  }, [logHiveActivity, toast]);

  useEffect(() => {
    verifyAgentConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const processJobCompletions = useCallback((jobs: IngestJobStatus[]) => {
    let shotsUpdatedCount = 0;
    const updatedJobs = jobs.map(job => {
      if (job.status === 'completed' && !job.hiveProcessedCompletion && job.determinedEventId && job.determinedPhotographerId) {
        logHiveActivity(`Processing HIVE shot updates for completed Job ID: ${job.jobId}, Event: ${getEventName(job.determinedEventId)}, Photographer: ${getPersonnelName(job.determinedPhotographerId)}.`);
        
        const shotsForEvent = getShotRequestsForEvent(job.determinedEventId);
        const shotsToUpdate = job.filesMatchedToEvents || job.filesProcessed || 0;
        let actualShotsUpdatedInThisJob = 0;

        const unassignedOrAssignedShots = shotsForEvent.filter(s => s.status === "Unassigned" || s.status === "Assigned");

        for (let i = 0; i < Math.min(shotsToUpdate, unassignedOrAssignedShots.length); i++) {
          const shotToUpdate = unassignedOrAssignedShots[i];
          const updatePayload: Partial<ShotRequestFormData> = {
            status: 'Captured',
            initialCapturerId: job.determinedPhotographerId,
            lastStatusModifierId: job.determinedPhotographerId,
            lastStatusModifiedAt: new Date().toISOString(),
          };
          updateShotRequest(job.determinedEventId, shotToUpdate.id, updatePayload);
          actualShotsUpdatedInThisJob++;
        }
        
        if (actualShotsUpdatedInThisJob > 0) {
          logHiveActivity(`HIVE updated ${actualShotsUpdatedInThisJob} shot request(s) to 'Captured' for event ${getEventName(job.determinedEventId)}.`, 'success');
          shotsUpdatedCount += actualShotsUpdatedInThisJob;
        }
        return { ...job, hiveProcessedCompletion: true };
      }
      return job;
    });

    if (shotsUpdatedCount > 0) {
      toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCount} shot(s) were marked as 'Captured' based on completed ingest jobs.`});
    }
    return updatedJobs;
  }, [getEventName, getPersonnelName, getShotRequestsForEvent, updateShotRequest, logHiveActivity, toast]);


  const handleFetchIngestionJobs = useCallback(async () => {
    setIsFetchingJobs(true);
    logHiveActivity("Fetching ingestion job list from HIVE backend...");
    try {
      const fetchedJobs = await localUtility.getIngestionJobsFromHIVE(); // This now calls HIVE's /api/ingest-jobs
      const processedJobs = processJobCompletions(fetchedJobs);
      setIngestionJobs(processedJobs);
      logHiveActivity(`Successfully fetched ${fetchedJobs.length} job(s) from HIVE backend.`, 'success');
      if (fetchedJobs.length > 0) {
        toast({ title: "Job List Updated", description: `Fetched ${fetchedJobs.length} job(s).` });
      } else {
        toast({ title: "No Jobs Found", description: "No ingestion jobs reported to HIVE yet." });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logHiveActivity(`Error fetching ingestion jobs from HIVE backend: ${errorMessage}`, 'error');
      toast({ title: "Failed to Fetch Jobs", description: errorMessage, variant: "destructive" });
      setIngestionJobs([]);
    } finally {
      setIsFetchingJobs(false);
    }
  }, [localUtility, processJobCompletions, logHiveActivity, toast]);
  
  useEffect(() => {
    if (useDemoData) {
        handleFetchIngestionJobs();
    } else {
        setIngestionJobs([]);
        setHiveActivityLog([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDemoData]); // Run when useDemoData changes


  const handleFetchAvailableDrives = async () => {
    setIsLoadingAvailableDrives(true);
    logHiveActivity("Attempting to fetch available drives from local agent...");
    try {
      const drives = await localUtility.getAvailableDrives();
      setAvailablePaths(drives.locations);
      logHiveActivity(`Local agent reported drives: ${drives.locations.map(d => d.path).join(', ')}`, 'success');
      toast({ title: "Drives Fetched", description: "Successfully fetched drive list from local agent."});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logHiveActivity(`Error fetching drives from local agent: ${errorMessage}`, 'error');
      toast({ title: "Failed to Fetch Drives", description: errorMessage, variant: "destructive" });
      setAvailablePaths([]);
    } finally {
      setIsLoadingAvailableDrives(false);
    }
  };


  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects;

  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle; 
    let textColor = "text-muted-foreground";
    let statusText = "Unknown";

    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = CheckCircle;
        textColor = "text-green-600 dark:text-green-400";
        statusText = "Connected";
        break;
      case 'disconnected':
        IconComponent = XCircle;
        textColor = "text-red-600 dark:text-red-400";
        statusText = "Disconnected";
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        statusText = "Checking...";
        break;
    }
    return (
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className={cn("h-5 w-5", textColor, agentConnectionStatus === 'checking' && "animate-spin")} />
        <span className={textColor}>{statusText}</span>
        <Button variant="ghost" size="sm" onClick={() => verifyAgentConnection(true)} className="h-7 px-2 py-1 text-xs" title="Refresh Connection Status" disabled={agentConnectionStatus === 'checking'}>
           <RefreshCw className={cn("h-3.5 w-3.5", agentConnectionStatus === 'checking' && "animate-spin")} />
        </Button>
      </div>
    );
  };
  

  if (isLoadingContexts) {
    return <div className="p-4">Loading HIVE context...</div>;
  }
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8" /> Ingestion Job Monitor 
        </p>
        <AgentStatusIndicator />
      </div>
      
      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Use your **Local Desktop Ingestion Utility** to select media, destinations, and start the ingestion process. The utility will analyze media to determine Photographer and Event context (querying HIVE APIs or prompting you if needed).</p>
            <p>2. The Local Utility will report job progress and completion to HIVE's backend.</p>
            <p>3. Click **"Refresh Ingestion Data"** below to view the latest job statuses reported to HIVE.</p>
            <p>4. Completed jobs will automatically update relevant shot request statuses in HIVE.</p>
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button onClick={handleFetchIngestionJobs} disabled={isFetchingJobs || agentConnectionStatus !== 'connected'}>
            {isFetchingJobs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Ingestion Data
        </Button>
         <Button onClick={handleFetchAvailableDrives} variant="outline" disabled={isLoadingAvailableDrives || agentConnectionStatus !== 'connected'}>
            {isLoadingAvailableDrives ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
            Fetch Available Drives (Conceptual)
        </Button>
      </div>

      {availablePaths.length > 0 && (
        <Card className="bg-muted/30 p-3">
          <CardContent className="pt-3">
            <p className="font-medium">Agent reported drives (conceptual):</p>
            <ul className="list-disc list-inside pl-2">
                {availablePaths.map((drive, index) => <li key={`${drive.path}-${index}`}>{drive.path}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader>
            <p className="text-lg font-semibold">Reported Ingestion Jobs</p>
            <div className="text-sm text-muted-foreground">List of ingestion jobs reported by the local utility to HIVE.</div>
        </CardHeader>
        <CardContent>
            {isFetchingJobs && <p className="text-muted-foreground text-center py-4">Loading ingestion jobs...</p>}
            {!isFetchingJobs && ingestionJobs.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                    No ingestion jobs reported yet. Ensure your local utility is running and reporting jobs to HIVE, then click "Refresh Ingestion Data".
                </p>
            )}
            {!isFetchingJobs && ingestionJobs.length > 0 && (
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
                                <TableCell className="text-xs truncate" title={job.jobId}>{job.jobId.substring(0, 15)}...</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        job.status === 'completed' ? 'default' :
                                        job.status === 'failed' || job.status === 'cancelled' ? 'destructive' :
                                        'secondary'
                                    }>{job.status}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">{getPersonnelName(job.determinedPhotographerId)}</TableCell>
                                <TableCell className="text-xs">{getEventName(job.determinedEventId)}</TableCell>
                                <TableCell className="text-xs">{job.progress !== undefined ? `${job.progress}%` : 'N/A'}</TableCell>
                                <TableCell className="text-xs">
                                    {job.filesMatchedToEvents !== undefined || job.filesProcessed !== undefined 
                                        ? `${job.filesMatchedToEvents ?? job.filesProcessed ?? 'N/A'}${job.totalFiles !== undefined ? ` / ${job.totalFiles}` : ''}` 
                                        : 'N/A'}
                                </TableCell>
                                <TableCell className="text-xs">{job.totalSizeMB !== undefined ? job.totalSizeMB.toFixed(1) : 'N/A'}</TableCell>
                                <TableCell className="text-xs">{job.checksumResult || 'N/A'}</TableCell>
                                <TableCell className="text-xs truncate max-w-xs" title={job.message || "No message"}>{job.message || "N/A"}</TableCell>
                                <TableCell>
                                    {job.reportUrl ? (
                                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs">
                                            <a href={job.reportUrl} target="_blank" rel="noopener noreferrer">View Report</a>
                                        </Button>
                                    ) : <span className="text-xs text-muted-foreground">N/A</span>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

       <Card className="mt-4">
          <CardHeader>
            <p className="text-lg font-semibold">HIVE Activity Log</p>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={hiveActivityLog.join('\n')}
              className="h-40 font-mono text-xs bg-muted/30"
              placeholder="HIVE interaction log..."
            />
          </CardContent>
        </Card>

       <Alert variant="destructive" className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page monitors ingestion jobs. The actual file selection, copying, EXIF parsing, and folder creation are performed by a **separate local desktop agent application** running on your computer. This agent communicates job status and reports back to HIVE's backend. Ensure your local agent is running, authenticated, and configured to communicate with HIVE.
        </AlertDescription>
      </Alert>
    </div>
  );
}
