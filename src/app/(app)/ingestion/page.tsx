
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, ListChecks, FolderInput, HardDrive, Power, PowerOff, Briefcase, CalendarDays, HelpCircle, KeySquare } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequest } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo, type PhotographerInfoForAgent as PhotographerInfoFromLocalUtil, type IngestJobRequest } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

interface MonitoredJobDetails {
  photographerName?: string;
  eventName?: string;
  photographerId?: string;
  eventId?: string;
}

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

  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>("");
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false); // Renamed from isSignaling
  const [monitoredJobDetails, setMonitoredJobDetails] = useState<MonitoredJobDetails | null>(null);

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'INFO: ';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const verifyAgentConnection = useCallback(async (showToast = false) => {
    setAgentConnectionStatus('checking');
    logMessage("Verifying HIVE connection to local agent (http://localhost:8765/available-drives)...");
    try {
      await localUtility.getAvailableDrives(); // Assuming this is a simple GET endpoint
      setAgentConnectionStatus('connected');
      logMessage("HIVE successfully connected to local agent.", 'success');
      if (showToast) {
        toast({
          title: "Local Agent Connected",
          description: "HIVE is connected to the local ingestion agent.",
        });
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAgentConnectionStatus('disconnected');
      logMessage(`HIVE failed to connect to local agent: ${errorMessage}`, 'error');

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
  }, [logMessage, toast]);

  useEffect(() => {
    verifyAgentConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);
  
  const isMonitoringRef = useRef(isMonitoring);
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);
  
  const currentJobIdRef = useRef(currentJobId);
  useEffect(() => {
    currentJobIdRef.current = currentJobId;
  }, [currentJobId]);


  const startMonitoringJob = async () => {
    if (!jobIdToMonitorInput.trim()) {
      toast({ title: "Job ID Required", description: "Please enter a Job ID provided by your local utility.", variant: "destructive" });
      return;
    }
    if (!(await verifyAgentConnection(true))) {
      toast({ title: 'Agent Not Connected', description: 'Cannot start monitoring. Please ensure the local agent is running and HIVE is connected.', variant: 'destructive'});
      return;
    }

    if (pollingIntervalId) clearInterval(pollingIntervalId);
    setIsMonitoring(true);
    setCurrentJobId(jobIdToMonitorInput.trim());
    setMonitoredJobDetails(null); // Clear previous monitored details
    setIngestionSummary(null);
    setIngestionLog([`${new Date().toLocaleTimeString()}: INFO: Attempting to monitor Job ID: ${jobIdToMonitorInput.trim()}`]);
    logMessage(`Monitoring started for Job ID: ${jobIdToMonitorInput.trim()}. Polling local agent...`);

    const newJobId = jobIdToMonitorInput.trim(); 

    const intervalId = setInterval(async () => {
      if (!isMonitoringRef.current || currentJobIdRef.current !== newJobId) {
        logMessage(`Polling stopped for ${newJobId} as monitoring state or job ID changed.`);
        clearInterval(intervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false); 
        return;
      }
      try {
        logMessage(`Polling status for Job ID: ${newJobId}...`);
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(newJobId);
        logMessage(`Agent reported status for Job ${newJobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
        setIngestionSummary(statusResult);

        // Update monitored job details if not yet set and agent provides them
        if (!monitoredJobDetails && (statusResult.determinedEventId || statusResult.determinedPhotographerId)) {
          const determinedEvent = statusResult.determinedEventId ? getEventById(statusResult.determinedEventId) : null;
          const determinedPhotographer = statusResult.determinedPhotographerId ? initialPersonnelMock.find(p => p.id === statusResult.determinedPhotographerId) : null;
          setMonitoredJobDetails({
            eventId: statusResult.determinedEventId,
            eventName: determinedEvent?.name || statusResult.determinedEventId || "N/A",
            photographerId: statusResult.determinedPhotographerId,
            photographerName: determinedPhotographer?.name || statusResult.determinedPhotographerId || "N/A",
          });
          logMessage(`Context from agent: Event="${determinedEvent?.name || 'ID:'+statusResult.determinedEventId}", Photographer="${determinedPhotographer?.name || 'ID:'+statusResult.determinedPhotographerId}"`);
        }
        
        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          clearInterval(intervalId);
          setPollingIntervalId(null);
          setIsMonitoring(false); 
          logMessage(`Ingestion job ${newJobId} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
          
          if (statusResult.status === 'completed' && monitoredJobDetails?.eventId && monitoredJobDetails?.photographerId) {
            const shotsToUpdateCount = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
             const eventIdForUpdate = monitoredJobDetails.eventId;
            const photographerIdForUpdate = monitoredJobDetails.photographerId;

            if (shotsToUpdateCount > 0 && eventIdForUpdate && photographerIdForUpdate) {
              logMessage(`Updating up to ${shotsToUpdateCount} shot requests in HIVE for event "${monitoredJobDetails.eventName}" by ${monitoredJobDetails.photographerName}...`);
              const allShotsForEvent = getShotRequestsForEvent(eventIdForUpdate) || [];
              const unassignedOrAssignedShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
              
              let shotsActuallyUpdatedCount = 0;
              for (let i = 0; i < Math.min(unassignedOrAssignedShots.length, shotsToUpdateCount); i++) {
                const shotToUpdate = unassignedOrAssignedShots[i];
                if (shotToUpdate && shotToUpdate.id) {
                  updateShotRequest(eventIdForUpdate, shotToUpdate.id, {
                    status: 'Captured',
                    initialCapturerId: photographerIdForUpdate,
                    lastStatusModifierId: photographerIdForUpdate,
                    lastStatusModifiedAt: new Date().toISOString(),
                  });
                  logMessage(`HIVE status updated for shot: "${shotToUpdate.description.substring(0,30)}..." to Captured by ${monitoredJobDetails.photographerName}.`);
                  shotsActuallyUpdatedCount++;
                }
              }
              setIngestionSummary(prev => prev ? {...prev, filesMatchedToEvents: shotsActuallyUpdatedCount } : { jobId: newJobId, status: 'completed', filesMatchedToEvents: shotsActuallyUpdatedCount });
              if (shotsActuallyUpdatedCount > 0) {
                  toast({ title: "HIVE Shot Statuses Updated", description: `${shotsActuallyUpdatedCount} shot requests for event "${monitoredJobDetails.eventName}" marked as 'Captured'.`});
              } else {
                  logMessage("No uncaptured shot requests were available in HIVE to update for this event, or agent reported 0 files processed/matched.");
              }
            } else {
               logMessage("Agent reported 0 files processed/matched for HIVE update, or context (Event/Photographer ID from agent) missing. No HIVE shot statuses updated.");
            }
          }
        }
      } catch (statusError: any) {
        logMessage(`Error polling job status for ${newJobId} from local agent: ${statusError.message || String(statusError)}`, 'error');
        if (intervalId) clearInterval(intervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false); 
        toast({ title: 'Polling Error', description: `Could not get status for job ${newJobId}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 5000);
    setPollingIntervalId(intervalId);
  };
  
  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle;
    let textColor = "text-muted-foreground";
    let iconColor = "text-muted-foreground";
    let statusText = "Unknown";

    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = Power;
        textColor = "text-green-600 dark:text-green-400";
        iconColor = textColor;
        statusText = "Connected";
        break;
      case 'disconnected':
        IconComponent = PowerOff;
        textColor = "text-red-600 dark:text-red-400";
        iconColor = textColor;
        statusText = "Disconnected";
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        iconColor = textColor;
        statusText = "Checking...";
        break;
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className={cn("h-5 w-5", iconColor, agentConnectionStatus === 'checking' && "animate-spin")} />
        <span className={textColor}>{statusText}</span>
        <Button variant="ghost" size="sm" onClick={() => verifyAgentConnection(true)} className="h-7 px-2 py-1 text-xs" title="Refresh Connection Status" disabled={agentConnectionStatus === 'checking'}>
           <RefreshCw className={cn("h-3.5 w-3.5", agentConnectionStatus === 'checking' && "animate-spin")} />
        </Button>
      </div>
    );
  };
  
  const expectedFolderPath = useMemo(() => {
    if (!monitoredJobDetails?.eventName || !monitoredJobDetails?.photographerName || !monitoredJobDetails?.eventId) {
      return "[Context from Local Agent will populate example structure]";
    }
    const eventForPath = getEventById(monitoredJobDetails.eventId);
    const eventDateFormatted = eventForPath?.date ? format(parseISO(eventForPath.date), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = monitoredJobDetails.eventName.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 30);
    const photographerNameSanitized = monitoredJobDetails.photographerName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const projectNameSanitized = selectedProject ? selectedProject.name.replace(/[^a-zA-Z0-9_.-]/g, '_') : 'PROJECT_NAME';
    
    return `[Your_Root_Destination_Path_Selected_In_Local_Utility]/${projectNameSanitized}/CAPTURE/${eventDateFormatted}/${eventNameSanitized}/${photographerNameSanitized}/`;
  }, [monitoredJobDetails, selectedProject, getEventById]);
  
  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects;

  if (isLoadingContexts && agentConnectionStatus === 'unknown') {
    return <div className="p-4">Loading HIVE context...</div>;
  }
   if (!useDemoData && !isLoadingSettings) {
     return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Data Disabled</AlertTitle>
        <AlertDescription>
          The Ingestion Monitor relies on HIVE demo data for context (events, personnel) to display names. Enable "Load Demo Data" in Settings for full UI functionality. Monitoring of Job IDs will still work.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Ingestion Job Monitor
        </h1>
        <AgentStatusIndicator />
      </div>
      
      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Use your **Local Desktop Ingestion Utility** to select media, destinations, and start the ingestion process.</p>
            <p>2. The Local Utility will analyze media metadata (camera serials, timestamps) to determine the Photographer and Event context (it may query HIVE APIs for roster/schedules or prompt you if needed).</p>
            <p>3. After starting the job, the Local Utility will **provide you with a unique Job ID**.</p>
            <p>4. Enter that Job ID below and click "Monitor This Job" for HIVE to track its progress and update relevant shot statuses upon completion.</p>
        </AlertDescription>
      </Alert>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Monitor Ingestion Job</CardTitle>
          <CardDescription>
            Enter the Job ID provided by your local desktop utility to monitor its status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
                <div className="flex-grow space-y-1.5">
                    <Label htmlFor="jobIdInput">Job ID from Local Agent</Label>
                    <Input 
                        id="jobIdInput" 
                        value={jobIdToMonitorInput} 
                        onChange={(e) => setJobIdToMonitorInput(e.target.value)} 
                        placeholder="Enter Job ID here..." 
                        disabled={isMonitoring}
                    />
                </div>
                <Button 
                  onClick={startMonitoringJob} 
                  disabled={isMonitoring || !jobIdToMonitorInput.trim() || agentConnectionStatus !== 'connected'}
                  className="h-10"
                >
                 {isMonitoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                 {isMonitoring ? `Monitoring: ${currentJobId}` : "Monitor This Job"}
                </Button>
            </div>
        </CardContent>
      </Card>

      {isMonitoring && currentJobId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>Actively polling local agent for Job ID: <span className="font-semibold text-foreground">{currentJobId}</span>.</span>
        </div>
      )}
      
      {currentJobId && monitoredJobDetails && (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-base">Monitored Job Context (from Agent)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
                <p><strong>Photographer:</strong> {monitoredJobDetails.photographerName || "N/A"}</p>
                <p><strong>Event:</strong> {monitoredJobDetails.eventName || "N/A"}</p>
            </CardContent>
        </Card>
      )}

      {(ingestionLog.length > 0 && currentJobId) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log</CardTitle>
            {currentJobId && <CardDescription>HIVE Log for Job ID: <span className="font-mono">{currentJobId}</span></CardDescription>}
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={ingestionLog.join('\n')}
              className="h-48 font-mono text-xs bg-muted/30"
              placeholder="Agent communication log will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {ingestionSummary && currentJobId && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ingestion Summary Report</CardTitle>
             {ingestionSummary.jobId && <CardDescription>Job ID: <span className="font-mono">{ingestionSummary.jobId}</span></CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Overall Agent Status: <span className={cn("font-semibold", ingestionSummary.status === 'failed' || ingestionSummary.status === 'cancelled' ? 'text-destructive' : ingestionSummary.status === 'completed' ? 'text-green-600' : '')}>{ingestionSummary.status}</span></p>
            <p>Agent Message: <span className="italic text-muted-foreground">{ingestionSummary.message || "N/A"}</span></p>
            <p>Agent - Total Files Detected by Agent: <span className="font-semibold">{ingestionSummary.totalFiles ?? "N/A"}</span></p>
            <p>Agent - Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed ?? "N/A"}</span></p>
            <p>Agent - Files Matched to Event Context (by Agent): <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span></p>
            <p>Agent - Files Unmatched (by Agent): <span className="font-semibold">{ingestionSummary.filesUnmatched ?? "N/A"}</span></p>
            <p>Agent - Total Size: <span className="font-semibold">{ingestionSummary.totalSizeMB ?? "N/A"} MB</span></p>
            <p>
              Agent - Checksum Status: <span className="font-semibold">{ingestionSummary.checksumResult || "N/A"}</span>
               {(ingestionSummary.checksumResult?.toLowerCase().includes('pass') || ingestionSummary.checksumResult?.toLowerCase().includes('verified')) ? (
                <CheckCircle className="inline ml-1 h-4 w-4 text-green-500" />
              ) : ingestionSummary.checksumResult && !ingestionSummary.checksumResult.toLowerCase().includes('pending') && !ingestionSummary.checksumResult.toLowerCase().includes('n/a') && !ingestionSummary.checksumResult.toLowerCase().includes('passed') && !ingestionSummary.checksumResult.toLowerCase().includes('verified') ? (
                <XCircle className="inline ml-1 h-4 w-4 text-red-500" />
              ) : null}
            </p>
            {ingestionSummary.reportUrl && (
                <p>Agent Report URL: <a href={ingestionSummary.reportUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">{ingestionSummary.reportUrl}</a></p>
            )}
            {ingestionSummary.errors && ingestionSummary.errors.length > 0 && (
                <div>
                    <p className="font-semibold text-destructive">Agent Errors Reported:</p>
                    <ul className="list-disc list-inside text-destructive text-xs">
                        {ingestionSummary.errors.map((err, i) => <li key={`err-${i}`}>{err}</li>)}
                    </ul>
                </div>
            )}
             <p className="text-xs text-muted-foreground pt-2">HIVE Shot Requests Updated: {ingestionSummary.status === 'completed' && monitoredJobDetails?.eventId && monitoredJobDetails?.photographerId ? (ingestionSummary.filesMatchedToEvents ?? ingestionSummary.filesProcessed ?? 0) : "0 (pending agent completion or HIVE context not determined by agent)"}</p>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This report is based on the latest status from the local agent. HIVE updates its internal shot statuses based on the agent&apos;s report for files matched to the event context determined by the agent.</p>
          </CardFooter>
        </Card>
      )}
      
      <div className="space-y-4">
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-base">Expected Folder Structure (Reference)</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
                <p className="text-xs text-muted-foreground mt-1">Your local agent should be configured to create a folder structure similar to this, using the Photographer and Event context it determines.</p>
            </CardContent>
        </Card>
       </div>
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page monitors jobs initiated by your **separate local desktop agent application**. The local agent handles all file selection, path specification, copying, checksums, metadata parsing, and folder creation, and should provide you with a Job ID to enter above. It also determines photographer/event context by reading media and querying HIVE APIs.
        </AlertDescription>
      </Alert>
    </div>
  );
}
