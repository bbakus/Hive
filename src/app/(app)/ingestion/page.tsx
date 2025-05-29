
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, HelpCircle, ListChecks, FolderInput, HardDrive, Power, PowerOff } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
    updateShotRequest, 
    isLoadingEvents, 
    getEventById 
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  // Removed photographerId, eventId, path states as they are now conceptual for local agent
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>("");
  const [monitoredJobDetails, setMonitoredJobDetails] = useState<MonitoredJobDetails | null>(null);
  
  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'INFO: ';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const verifyAgentConnection = useCallback(async () => {
    setAgentConnectionStatus('checking');
    logMessage("Verifying HIVE connection to local agent (http://localhost:8765/available-drives)...");
    try {
      await localUtility.getAvailableDrives();
      setAgentConnectionStatus('connected');
      logMessage("HIVE successfully connected to local agent.", 'success');
      toast({
        title: "Local Agent Connected",
        description: "HIVE is connected to the local ingestion agent.",
        variant: "default"
      });
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
      } else if (errorMessage.includes("status:")) { // Other HTTP errors from agent
        toastDescription = `Agent responded with an error: ${errorMessage}. Check agent logs.`;
      }

      toast({
        title: "Agent Connection Failed",
        description: toastDescription,
        variant: "destructive",
        duration: 10000 
      });
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

  const handleSignalAgent = () => {
    if (!selectedProject) {
        toast({title: "No Project Selected", description: "Please select a project in HIVE first.", variant: "destructive"});
        return;
    }
    
    logMessage("User Action: Signaled local agent. User should now use the local desktop agent application to select paths, confirm context, and start the ingestion job.");
    logMessage("Once the local agent starts the job, it will provide a Job ID. Enter that Job ID below to monitor in HIVE.");
    
    toast({
      title: "Proceed with Local Agent",
      description: "Use your local desktop agent to initiate ingestion. Enter the Job ID it provides below to monitor.",
      duration: 10000,
    });
  };

  const startMonitoringJob = useCallback(async () => {
    const jobId = jobIdToMonitorInput.trim();
    if (!jobId) {
      toast({ title: "Missing Job ID", description: "Please enter the Job ID provided by your local agent.", variant: "destructive" });
      return;
    }
    if (!(await verifyAgentConnection())) {
      toast({ title: 'Agent Not Connected', description: 'Cannot monitor. Please ensure the local agent is running and HIVE is connected.', variant: 'destructive'});
      return;
    }

    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }
    setIsMonitoring(true);
    setCurrentJobId(jobId);
    setIngestionSummary(null); 
    setMonitoredJobDetails(null); // Clear previous job's context
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: INFO: HIVE monitoring Job ID: ${jobId}. Polling local agent for status updates.`, ...prev.slice(0,99)]);

    const newIntervalId = setInterval(async () => {
      // Check if the input still matches the job being polled to avoid race conditions if user changes input
      if (jobId !== (document.getElementById('jobIdInputForPollingHack') as HTMLInputElement)?.value && (document.getElementById('jobIdInputForPollingHack') as HTMLInputElement)?.value !== jobIdToMonitorInput.trim()) {
        logMessage(`Polling stopped for ${jobId} as input changed.`, 'info');
        clearInterval(newIntervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false);
        if (currentJobId === jobId) setCurrentJobId(null); // Clear if this was the current one
        return;
      }
      
      try {
        logMessage(`Polling status for Job ID: ${jobId}...`);
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(jobId);
        logMessage(`Agent reported status for Job ${jobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
        setIngestionSummary(statusResult);

        // Update monitored job details if not already set, or if they differ (agent might update context)
        if (!monitoredJobDetails || monitoredJobDetails.eventId !== statusResult.determinedEventId || monitoredJobDetails.photographerId !== statusResult.determinedPhotographerId ) {
            const determinedEvent = statusResult.determinedEventId ? getEventById(statusResult.determinedEventId) : undefined;
            const determinedPhotographer = statusResult.determinedPhotographerId ? initialPersonnelMock.find(p => p.id === statusResult.determinedPhotographerId) : undefined;
            setMonitoredJobDetails({
              eventId: statusResult.determinedEventId,
              eventName: determinedEvent?.name || (statusResult.determinedEventId ? "Event (ID: " + statusResult.determinedEventId + ")" : "Context not set by agent"),
              photographerId: statusResult.determinedPhotographerId,
              photographerName: determinedPhotographer?.name || (statusResult.determinedPhotographerId ? "Photographer (ID: " + statusResult.determinedPhotographerId + ")" : "Context not set by agent"),
            });
          }


        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          clearInterval(newIntervalId); 
          setPollingIntervalId(null);
          setIsMonitoring(false);
          logMessage(`Ingestion job ${jobId} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
          
          const effectiveEventId = monitoredJobDetails?.eventId || statusResult.determinedEventId;
          const effectivePhotographerId = monitoredJobDetails?.photographerId || statusResult.determinedPhotographerId;
          
          if (statusResult.status === 'completed' && effectiveEventId && effectivePhotographerId) {
            const shotsToUpdateInHIVE = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
            const effectiveEvent = getEventById(effectiveEventId);
            const effectivePhotographer = initialPersonnelMock.find(p => p.id === effectivePhotographerId);

            if (shotsToUpdateInHIVE > 0 && effectiveEvent) {
                logMessage(`Updating up to ${shotsToUpdateInHIVE} shot requests in HIVE for event "${effectiveEvent.name}" by ${effectivePhotographer?.name || 'Unknown Photog'}...`);
                const allShotsForEvent = getShotRequestsForEvent(effectiveEventId) || [];
                const unassignedOrAssignedShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                
                let shotsActuallyUpdatedCount = 0;
                for (let i = 0; i < Math.min(unassignedOrAssignedShots.length, shotsToUpdateInHIVE); i++) {
                    const shotToUpdate = unassignedOrAssignedShots[i];
                    if (shotToUpdate && shotToUpdate.id) {
                        updateShotRequest(effectiveEventId, shotToUpdate.id, {
                          status: 'Captured',
                          initialCapturerId: effectivePhotographerId,
                          lastStatusModifierId: effectivePhotographerId,
                          lastStatusModifiedAt: new Date().toISOString(),
                        });
                        logMessage(`HIVE status updated for shot: "${shotToUpdate.description.substring(0,30)}..." to Captured by ${effectivePhotographer?.name || 'Unknown Photog'}.`);
                        shotsActuallyUpdatedCount++;
                    }
                }
                setIngestionSummary(prev => prev ? {...prev, filesMatchedToEvents: shotsActuallyUpdatedCount } : { jobId: jobId, status: 'completed', filesMatchedToEvents: shotsActuallyUpdatedCount });
                if (shotsActuallyUpdatedCount > 0) {
                    toast({ title: "HIVE Shot Statuses Updated", description: `${shotsActuallyUpdatedCount} shot requests for event "${effectiveEvent.name}" marked as 'Captured'.`});
                } else {
                    logMessage("No uncaptured shot requests were available in HIVE to update for this event, or agent reported 0 files processed/matched.");
                }
            } else if (effectiveEvent && shotsToUpdateInHIVE === 0) {
                 logMessage("Agent reported 0 files processed/matched, or no value provided. No HIVE shot statuses updated.");
            } else if (!effectiveEvent) {
                 logMessage("Agent reported job complete, but HIVE could not find the determined event ID: " + effectiveEventId);
            }
          } else if (statusResult.status === 'completed' && !(effectiveEventId && effectivePhotographerId)) {
            logMessage("Job completed by agent, but HIVE could not determine specific event/photographer context from agent's report to update shot lists. Agent files processed: " + (statusResult.filesProcessed || 'N/A'), 'info');
          }
        }
      } catch (statusError: any) {
        logMessage(`Error getting job status for ${jobId} from local agent: ${statusError.message || String(statusError)}`, 'error');
        clearInterval(newIntervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false);
        // Keep currentJobId set so user can see which job failed.
        toast({ title: 'Polling Error', description: `Could not get status for job ${jobId}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 5000); 
    setPollingIntervalId(newIntervalId);
  }, [
    jobIdToMonitorInput, 
    verifyAgentConnection, 
    pollingIntervalId,
    logMessage, 
    toast, 
    getEventById, 
    updateShotRequest,
    getShotRequestsForEvent,
    monitoredJobDetails, // Added dependency
    currentJobId // Added dependency
  ]);

  useEffect(() => {
    // Clear polling and job details if the project context changes,
    // or if the job ID input is cleared while not actively polling.
    if (pollingIntervalId && currentJobId && !jobIdToMonitorInput && !isMonitoring) {
      logMessage(`Job ID input cleared. Stopping monitoring for ${currentJobId}.`, 'info');
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setCurrentJobId(null);
      setMonitoredJobDetails(null);
      setIngestionSummary(null);
    }
     // If the selected project changes, reset the entire ingestion state
    if (selectedProject) { // Assuming this effect runs when selectedProject changes
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setCurrentJobId(null);
        setJobIdToMonitorInput("");
        setMonitoredJobDetails(null);
        setIngestionSummary(null);
        setIsMonitoring(false);
        setIngestionLog(prev => prev.length > 0 ? [`${new Date().toLocaleTimeString()}: INFO: Project changed. Ingestion monitor reset.`] : []);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, jobIdToMonitorInput]); // Removed pollingIntervalId, currentJobId, isMonitoring from deps to avoid loops.


  const isLoading = isLoadingSettings || isLoadingEvents || isLoadingProjects;

  useEffect(() => {
    if (selectedProject && monitoredJobDetails?.eventId) {
      const projectOfMonitoredEvent = getEventById(monitoredJobDetails.eventId)?.projectId;
      if (projectOfMonitoredEvent && selectedProject.id !== projectOfMonitoredEvent) {
         logMessage(`Warning: HIVE's selected project (${selectedProject.name}) differs from the project associated with the agent-determined event (${getEventById(monitoredJobDetails.eventId)?.project || 'Unknown Project'}). Shot updates will apply to the agent-determined event.`, "info");
      }
    }
  }, [selectedProject, monitoredJobDetails, getEventById, logMessage]);

  const AgentStatusIndicator = () => {
    let IconComponent;
    let textColor = "text-muted-foreground";
    let bgColor = "bg-gray-400";
    let statusText = "Unknown";
    let iconColor = "text-muted-foreground";


    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = Power;
        textColor = "text-green-600 dark:text-green-400";
        bgColor = "bg-green-500";
        statusText = "Connected";
        iconColor = textColor;
        break;
      case 'disconnected':
        IconComponent = PowerOff;
        textColor = "text-red-600 dark:text-red-400";
        bgColor = "bg-red-500";
        statusText = "Disconnected";
        iconColor = textColor;
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        bgColor = "bg-yellow-500";
        statusText = "Checking...";
        iconColor = textColor;
        break;
      default: // unknown
        IconComponent = HelpCircle;
        iconColor = "text-muted-foreground";
        break;
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className={cn("h-5 w-5", iconColor, agentConnectionStatus === 'checking' && "animate-spin")} />
        <span className={textColor}>{statusText}</span>
        <Button variant="ghost" size="sm" onClick={verifyAgentConnection} className="h-7 px-2 py-1 text-xs" title="Refresh Connection Status" disabled={agentConnectionStatus === 'checking'}>
           <RefreshCw className={cn("h-3.5 w-3.5", agentConnectionStatus === 'checking' && "animate-spin")} />
        </Button>
      </div>
    );
  };
  
  const expectedFolderPath = useMemo(() => {
    const contextPhotographerName = monitoredJobDetails?.photographerName;
    const contextEvent = monitoredJobDetails?.eventId ? getEventById(monitoredJobDetails.eventId) : undefined;
    
    if (!contextEvent || !contextPhotographerName) return "[Monitor Job for Contextual Path Example]";
    
    const eventDateFormatted = contextEvent.date ? format(new Date(contextEvent.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = contextEvent.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const eventIdPrefix = contextEvent.id.substring(0,Math.min(4, contextEvent.id.length));
    
    let photographerNameSanitized = "PHOTOG";
    if (contextPhotographerName) {
        const nameParts = contextPhotographerName.split(" ");
        const initials = nameParts.map(part => part[0]).join("").toUpperCase();
        photographerNameSanitized = initials.substring(0,3) || contextPhotographerName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,10);
    }
    const projectNameSanitized = monitoredJobDetails && contextEvent?.project ? contextEvent.project.replace(/[^a-zA-Z0-9_]/g, '_') : (selectedProject?.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'PROJECT_NAME');
    
    return `[Your_Root_Destination_Path]/CLIENT_XYZ/${projectNameSanitized}/CAPTURE/${eventDateFormatted}/${eventIdPrefix}_${eventNameSanitized}/${photographerNameSanitized}/`;
  }, [monitoredJobDetails, selectedProject, getEventById]);
  
  if (isLoading) {
    return <div className="p-4">Loading ingestion utility settings...</div>;
  }
  if (!useDemoData && !isLoadingSettings) {
     return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Data Disabled</AlertTitle>
        <AlertDescription>
          The Ingestion Utility uses demo data for HIVE context (events, personnel). Please enable "Load Demo Data" in Settings to use this utility. The local agent operates independently but HIVE will not be ableto update shot requests without its internal context.
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
       <p className="text-muted-foreground -mt-6">
          Use your local desktop agent to select paths and start an ingestion job. The agent will provide a Job ID. Enter that Job ID below to monitor its progress through HIVE.
      </p>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 1: Initiate Ingestion with Local Agent</CardTitle>
          <CardDescription>
            Use your separate local desktop agent application to start an ingestion. The agent will provide you with a Job ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <p className="text-sm text-muted-foreground">
                HIVE Project Context (for reference by local agent): <span className="font-semibold">{selectedProject?.name || "No HIVE Project Selected"}</span>
            </p>
             <p className="text-xs text-muted-foreground mt-1">
                The local agent determines the actual photographer and event context from media metadata and its own job setup. HIVE updates its records based on the agent&apos;s report for the monitored Job ID.
            </p>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSignalAgent} variant="outline" disabled={!selectedProject || agentConnectionStatus !== 'connected'}>
                Instructions for Local Agent
            </Button>
             {!selectedProject && <p className="text-xs text-destructive ml-2">Select a project in HIVE first.</p>}
        </CardFooter>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 2: Monitor Job from Local Agent</CardTitle>
          <CardDescription>
            Enter the Job ID provided by your local desktop agent to monitor its progress through HIVE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
                <div className="flex-grow space-y-1">
                    <Label htmlFor="jobIdInput">Job ID from Local Agent</Label>
                    <Input 
                        id="jobIdInput" 
                        value={jobIdToMonitorInput} 
                        onChange={(e) => setJobIdToMonitorInput(e.target.value)} 
                        placeholder="Paste Job ID here" 
                        disabled={agentConnectionStatus !== 'connected' || isMonitoring} 
                        className="font-mono"
                    />
                     <input type="hidden" id="jobIdInputForPollingHack" value={jobIdToMonitorInput} />
                </div>
                <Button onClick={startMonitoringJob} disabled={!jobIdToMonitorInput.trim() || isMonitoring || agentConnectionStatus !== 'connected'}>
                 <ListChecks className="mr-2 h-4 w-4" />
                 Monitor This Job
                </Button>
            </div>
            {isMonitoring && currentJobId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span>Polling for Job ID: <span className="font-semibold text-foreground">{currentJobId}</span>. Waiting for updates...</span>
                </div>
            )}
             {currentJobId && !isMonitoring && ingestionSummary && (
                 <p className="text-sm text-muted-foreground">Monitoring for Job ID <span className="font-semibold text-foreground">{currentJobId}</span> has {ingestionSummary.status === 'completed' ? 'completed' : 'stopped'}.</p>
            )}
        </CardContent>
      </Card>

      {monitoredJobDetails && currentJobId && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Monitored Job Context (Reported by Agent)</CardTitle>
            <CardDescription>Job ID: <span className="font-mono">{currentJobId}</span></CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><span className="font-medium text-muted-foreground">Photographer:</span> {monitoredJobDetails.photographerName || "N/A"}</p>
            <p><span className="font-medium text-muted-foreground">Event:</span> {monitoredJobDetails.eventName || "N/A"}</p>
          </CardContent>
        </Card>
      )}

      {(ingestionLog.length > 0) && (
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

      {ingestionSummary && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ingestion Summary Report</CardTitle>
             {ingestionSummary.jobId && <CardDescription>Job ID: <span className="font-mono">{ingestionSummary.jobId}</span></CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Overall Status: <span className={cn("font-semibold", ingestionSummary.status === 'failed' ? 'text-destructive' : ingestionSummary.status === 'completed' ? 'text-green-600' : '')}>{ingestionSummary.status}</span></p>
            <p>Agent Message: <span className="italic text-muted-foreground">{ingestionSummary.message || "N/A"}</span></p>
            <p>Total Files Detected by Agent: <span className="font-semibold">{ingestionSummary.totalFiles ?? "N/A"}</span></p>
            <p>Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed ?? "N/A"}</span></p>
            <p>Files Agent Matched to Event Context: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span></p>
            <p>Files Unmatched by Agent: <span className="font-semibold">{ingestionSummary.filesUnmatched ?? "N/A"}</span></p>
            <p>Total Size (Agent): <span className="font-semibold">{ingestionSummary.totalSizeMB ?? "N/A"} MB</span></p>
            <p>
              Agent Checksum Status: <span className="font-semibold">{ingestionSummary.checksumResult || "N/A"}</span>
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
             <p className="text-xs text-muted-foreground pt-2">HIVE Shot Requests Updated: {ingestionSummary.status === 'completed' ? ( (monitoredJobDetails?.eventId && monitoredJobDetails?.photographerId) ? (ingestionSummary.filesMatchedToEvents ?? ingestionSummary.filesProcessed ?? 0) : "0 (Context not determined by agent for HIVE update)") : "0 (pending agent completion)"}</p>
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
                <p className="text-xs text-muted-foreground mt-1">Your local agent should ideally create this structure based on the job context it determines or is provided.</p>
            </CardContent>
        </Card>
       </div>
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required for Actual File Operations</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page monitors ingestion jobs initiated by your **separate local desktop agent application**. The local agent handles all file selection, path specification, copying, checksums, metadata parsing, and folder creation. HIVE polls the local agent for status (using the Job ID you enter) and then updates its internal records (like shot statuses) based on the agent&apos;s reports of successfully processed files.
        </AlertDescription>
      </Alert>
    </div>
  );
}

