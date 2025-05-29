
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, HelpCircle, ListChecks, FolderInput, HardDrive, Power, PowerOff, Briefcase, CalendarDays, KeySquare } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type PhotographerInfoForAgent as LocalUtilPhotographerInfo, type DriveInfo } from '@/services/localUtility';
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
    isLoadingEvents, 
    getEventById,
    updateShotRequest,
    getShotRequestsForEvent
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>("");
  const [monitoredJobDetails, setMonitoredJobDetails] = useState<MonitoredJobDetails | null>(null);
  
  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [availablePaths, setAvailablePaths] = useState<DriveInfo[]>([]);


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
      } else if (errorMessage.includes("status:")) { 
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
      setPollingIntervalId(null);
    }

    setIsMonitoring(true);
    setCurrentJobId(jobId);
    setIngestionSummary(null); 
    setMonitoredJobDetails(null); 
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: INFO: HIVE monitoring Job ID: ${jobId}. Polling local agent for status updates.`, ...prev.slice(0,99)]);

    const newIntervalId = setInterval(async () => {
      // Ensure we are still monitoring the correct job, in case input changed
      if (currentJobId !== jobId || !isMonitoringRef.current) {
        logMessage(`Polling stopped for ${jobId} as current job or monitoring state changed.`, 'info');
        clearInterval(newIntervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false);
        return;
      }
      
      try {
        logMessage(`Polling status for Job ID: ${jobId}...`);
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(jobId);
        logMessage(`Agent reported status for Job ${jobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
        setIngestionSummary(statusResult);

        const determinedEvent = statusResult.determinedEventId ? getEventById(statusResult.determinedEventId) : undefined;
        const determinedPhotographer = statusResult.determinedPhotographerId ? initialPersonnelMock.find(p => p.id === statusResult.determinedPhotographerId) : undefined;
        
        if (!monitoredJobDetails || monitoredJobDetails.eventId !== statusResult.determinedEventId || monitoredJobDetails.photographerId !== statusResult.determinedPhotographerId ) {
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
          const effectiveEvent = effectiveEventId ? getEventById(effectiveEventId) : undefined;
          const effectivePhotographer = effectivePhotographerId ? initialPersonnelMock.find(p => p.id === effectivePhotographerId) : undefined;
          
          const shotsToUpdateCount = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
          
          if (statusResult.status === 'completed' && effectiveEventId && effectivePhotographerId && effectiveEvent) {
            if (shotsToUpdateCount > 0) {
                logMessage(`Updating up to ${shotsToUpdateCount} shot requests in HIVE for event "${effectiveEvent.name}" by ${effectivePhotographer?.name || 'Unknown Photog'}...`);
                const allShotsForEvent = getShotRequestsForEvent(effectiveEventId) || [];
                const unassignedOrAssignedShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                
                let shotsActuallyUpdatedCount = 0;
                for (let i = 0; i < Math.min(unassignedOrAssignedShots.length, shotsToUpdateCount); i++) {
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
            } else {
                 logMessage("Agent reported 0 files processed/matched for HIVE update, or no value provided. No HIVE shot statuses updated.");
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
    monitoredJobDetails,
    currentJobId 
  ]);
  
  // Ref to keep track of isMonitoring state inside interval
  const isMonitoringRef = React.useRef(isMonitoring);
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);


  useEffect(() => {
    if (currentJobId && !jobIdToMonitorInput && !isMonitoring) {
      logMessage(`Job ID input cleared. Stopping monitoring for ${currentJobId}.`, 'info');
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setCurrentJobId(null);
      setMonitoredJobDetails(null);
      setIngestionSummary(null);
      setIsMonitoring(false);
    }
  }, [jobIdToMonitorInput, currentJobId, isMonitoring, pollingIntervalId, logMessage]);


  useEffect(() => {
    if (selectedProject) { 
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        // Do not clear currentJobId or monitoring state here, as user might be monitoring a job for a different project context
        // than what is globally selected in HIVE. The monitoring is tied to the Job ID itself.
        // setIngestionLog(prev => prev.length > 0 ? [`${new Date().toLocaleTimeString()}: INFO: HIVE project context changed to ${selectedProject.name}. Current monitoring (if any) is unaffected.`] : []);
    }
  }, [selectedProject, pollingIntervalId]);

  useEffect(() => {
    if (selectedProject && monitoredJobDetails?.eventId) {
      const projectOfMonitoredEvent = getEventById(monitoredJobDetails.eventId)?.projectId;
      if (projectOfMonitoredEvent && selectedProject.id !== projectOfMonitoredEvent) {
         logMessage(`Warning: HIVE's selected project (${selectedProject.name}) differs from the project associated with the agent-determined event (${getEventById(monitoredJobDetails.eventId)?.project || 'Unknown Project'}). Shot updates will apply to the agent-determined event.`, "info");
      }
    }
  }, [selectedProject, monitoredJobDetails, getEventById, logMessage]);

  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle;
    let textColor = "text-muted-foreground";
    let statusText = "Unknown";
    let iconColor = "text-muted-foreground";


    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = Power;
        textColor = "text-green-600 dark:text-green-400";
        statusText = "Connected";
        iconColor = textColor;
        break;
      case 'disconnected':
        IconComponent = PowerOff;
        textColor = "text-red-600 dark:text-red-400";
        statusText = "Disconnected";
        iconColor = textColor;
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        statusText = "Checking...";
        iconColor = textColor;
        break;
      default: 
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
    
    if (!contextEvent || !contextPhotographerName) return "[Monitor a job for agent-determined context to see example path]";
    
    const eventDateFormatted = contextEvent.date ? format(new Date(contextEvent.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = contextEvent.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const eventIdPrefix = contextEvent.id.substring(0,Math.min(4, contextEvent.id.length));
    
    let photographerNameSanitized = "PHOTOG";
    if (contextPhotographerName) {
        const nameParts = contextPhotographerName.split(" ");
        const initials = nameParts.map(part => part[0]).join("").toUpperCase();
        photographerNameSanitized = initials.substring(0,3) || contextPhotographerName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,10);
    }
    const projectNameSanitized = contextEvent.project ? contextEvent.project.replace(/[^a-zA-Z0-9_]/g, '_') : 'PROJECT_NAME';
    
    return `[Your_Root_Destination_Path]/CLIENT_XYZ/${projectNameSanitized}/CAPTURE/${eventDateFormatted}/${eventIdPrefix}_${eventNameSanitized}/${photographerNameSanitized}/`;
  }, [monitoredJobDetails, getEventById, selectedProject]);
  
  const isLoading = isLoadingSettings || isLoadingEvents || isLoadingProjects;

  if (isLoading && agentConnectionStatus === 'unknown') { // Show loading only if agent status hasn't been checked yet
    return <div className="p-4">Loading HIVE context...</div>;
  }
  if (!useDemoData && !isLoadingSettings) {
     return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Data Disabled</AlertTitle>
        <AlertDescription>
          The Ingestion Utility relies on HIVE demo data for context (events, personnel) unless connected to a live backend. Please enable "Load Demo Data" in Settings. The local agent operates independently, but HIVE needs its internal context for shot updates.
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
            <p>1. Initiate ingestion using your **separate local desktop agent application**. This agent handles file selection, path specification, EXIF parsing, context determination (photographer/event by querying HIVE APIs or user prompts), file copying, and checksums.</p>
            <p>2. The local agent will provide you with a **Job ID** once it starts processing.</p>
            <p>3. Enter that Job ID below and click "Monitor This Job". HIVE will then poll your local agent for status updates and display progress. Upon completion, HIVE will update relevant shot statuses based on the agent's report.</p>
          </AlertDescription>
        </Alert>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 1: Obtain Job ID from Local Agent</CardTitle>
          <CardDescription>
            After starting the job in your local desktop agent, enter the Job ID it provides below.
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
                </div>
                <Button onClick={startMonitoringJob} disabled={!jobIdToMonitorInput.trim() || isMonitoring || agentConnectionStatus !== 'connected'}>
                 <ListChecks className="mr-2 h-4 w-4" />
                 Monitor This Job
                </Button>
            </div>
            {isMonitoring && currentJobId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span>Polling local agent for Job ID: <span className="font-semibold text-foreground">{currentJobId}</span>.</span>
                </div>
            )}
             {currentJobId && !isMonitoring && ingestionSummary && ( 
                 <p className="text-sm text-muted-foreground">Monitoring for Job ID <span className="font-semibold text-foreground">{currentJobId}</span> has {ingestionSummary.status === 'completed' ? 'completed' : 'stopped'}.</p>
            )}
        </CardContent>
      </Card>

      {/* Display Monitored Job Context if available */}
      {monitoredJobDetails && currentJobId && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Monitored Job Context (Reported by Agent)</CardTitle>
            <CardDescription>Job ID: <span className="font-mono">{currentJobId}</span></CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><Briefcase className="inline h-4 w-4 mr-1 text-muted-foreground"/> <span className="font-medium text-muted-foreground">HIVE Project (if matched):</span> {monitoredJobDetails.eventId ? (getEventById(monitoredJobDetails.eventId)?.project || "N/A") : "N/A"}</p>
            <p><ScanLine className="inline h-4 w-4 mr-1 text-muted-foreground"/> <span className="font-medium text-muted-foreground">Agent Determined Photographer:</span> {monitoredJobDetails.photographerName || "N/A"}</p>
            <p><CalendarDays className="inline h-4 w-4 mr-1 text-muted-foreground"/> <span className="font-medium text-muted-foreground">Agent Determined Event:</span> {monitoredJobDetails.eventName || "N/A"}</p>
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
            <p>Overall Agent Status: <span className={cn("font-semibold", ingestionSummary.status === 'failed' ? 'text-destructive' : ingestionSummary.status === 'completed' ? 'text-green-600' : '')}>{ingestionSummary.status}</span></p>
            <p>Agent Message: <span className="italic text-muted-foreground">{ingestionSummary.message || "N/A"}</span></p>
            <p>Agent - Total Files Detected: <span className="font-semibold">{ingestionSummary.totalFiles ?? "N/A"}</span></p>
            <p>Agent - Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed ?? "N/A"}</span></p>
            <p>Agent - Files Matched to Event Context by Agent: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span></p>
            <p>Agent - Files Unmatched by Agent: <span className="font-semibold">{ingestionSummary.filesUnmatched ?? "N/A"}</span></p>
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
             <p className="text-xs text-muted-foreground pt-2">HIVE Shot Requests Updated: {ingestionSummary.status === 'completed' && monitoredJobDetails?.eventId && monitoredJobDetails?.photographerId ? (ingestionSummary.filesMatchedToEvents ?? ingestionSummary.filesProcessed ?? 0) : "0 (pending agent completion or missing context)"}</p>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This report is based on the latest status from the local agent. HIVE updates its internal shot statuses based on the agent&apos;s report for files matched to the event context determined by the agent.</p>
          </CardFooter>
        </Card>
      )}
       <div className="space-y-4">
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-base">Expected Folder Structure (Reference by Local Agent)</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
                <p className="text-xs text-muted-foreground mt-1">Your local agent should create this structure based on the job context it determines (e.g., from EXIF data and HIVE API lookups).</p>
            </CardContent>
        </Card>
       </div>
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page monitors ingestion jobs initiated by your **separate local desktop agent application**. The local agent handles all file selection, path specification, copying, checksums, metadata parsing (EXIF), context determination (photographer/event using HIVE APIs), and folder creation. HIVE then updates its records based on the agent&apos;s reports.
        </AlertDescription>
      </Alert>
    </div>
  );
}


    