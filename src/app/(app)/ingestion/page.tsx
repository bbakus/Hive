
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, ListChecks, FolderInput, HardDrive, Power, PowerOff, Briefcase, CalendarDays, KeySquare, HelpCircle } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequest } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo, type PhotographerInfoForAgent, type IngestJobRequest } from '@/services/localUtility';
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

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [sourcePath1, setSourcePath1] = useState<string>("/Users/Default/Downloads/SourceCard1"); // Example default
  const [sourcePath2, setSourcePath2] = useState<string>("");
  const [workingPath, setWorkingPath] = useState<string>("/Volumes/RAID/WorkingFolder"); // Example default
  const [backupPath, setBackupPath] = useState<string>("");


  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'INFO: ';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const verifyAgentConnection = useCallback(async (showToast = false) => {
    setAgentConnectionStatus('checking');
    logMessage("Verifying HIVE connection to local agent (http://localhost:8765/available-drives)...");
    try {
      await localUtility.getAvailableDrives();
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

  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(p => PHOTOGRAPHY_ROLES.includes(p.role as any) && p.role !== "Client" && p.cameraSerials && p.cameraSerials.length > 0);
  }, []);

  const selectedPhotographerDetails = useMemo(() => {
    return initialPersonnelMock.find(p => p.id === selectedPhotographerId);
  }, [selectedPhotographerId]);

  const availableEvents = useMemo(() => {
    if (!selectedProject) return [];
    return eventsForSelectedProjectAndOrg.filter(e => e.isCovered);
  }, [selectedProject, eventsForSelectedProjectAndOrg]);

  const selectedEventDetails = useMemo(() => {
    return availableEvents.find(e => e.id === selectedEventId);
  }, [selectedEventId, availableEvents]);


  // Ref to keep track of isMonitoring state inside interval
  const isMonitoringRef = useRef(isMonitoring);
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);
  
  const currentJobIdRef = useRef(currentJobId);
  useEffect(() => {
    currentJobIdRef.current = currentJobId;
  }, [currentJobId]);

  const handleStartIngestion = async () => {
    if (!selectedPhotographerId || !selectedEventId || !sourcePath1.trim() || !workingPath.trim()) {
      toast({ title: "Missing Information", description: "Please select a photographer, event, and specify at least Source Path 1 and Working Destination Path.", variant: "destructive" });
      return;
    }
    if (!(await verifyAgentConnection(true))) { // Pass true to show toast on explicit action
      toast({ title: 'Agent Not Connected', description: 'Cannot start job. Please ensure the local agent is running and HIVE is connected.', variant: 'destructive'});
      return;
    }

    if (pollingIntervalId) clearInterval(pollingIntervalId);
    setIsStartingJob(true);
    setIsMonitoring(false);
    setCurrentJobId(null);
    setIngestionSummary(null);
    setIngestionLog([]);
    logMessage("Preparing job request for local agent...");

    const photographerDetails = initialPersonnelMock.find(p => p.id === selectedPhotographerId);
    if (!photographerDetails) {
        toast({ title: "Error", description: "Selected photographer details not found.", variant: "destructive" });
        setIsStartingJob(false);
        return;
    }
    const photographerForAgent: PhotographerInfoForAgent = {
      id: photographerDetails.id,
      name: photographerDetails.name,
      cameraSerials: photographerDetails.cameraSerials || [],
      // email, preferredRawFormat, notes can be added if available in HIVE's personnel model
    };
    
    const jobData: IngestJobRequest = {
      photographer: photographerForAgent,
      photographerCameraSerial: photographerForAgent.cameraSerials?.[0] || undefined, // Send first serial as primary
      eventId: selectedEventId,
      sourcePaths: [sourcePath1.trim(), ...(sourcePath2.trim() ? [sourcePath2.trim()] : [])],
      workingPath: workingPath.trim(),
      backupPath: backupPath.trim() || undefined, // Send undefined if empty
    };

    logMessage(`Sending job request to local agent for Event: ${selectedEventDetails?.name}, Photographer: ${photographerDetails?.name}.`);
    logMessage(`Conceptual Job Details Sent: ${JSON.stringify(jobData, null, 2)}`);
    logMessage("Waiting for local agent to confirm job start (this may take a moment if agent shows its own UI for path confirmation)...");


    try {
      const result = await localUtility.startIngest(jobData);
      if (result && result.jobId) {
        logMessage(`Local agent responded. Job ID: ${result.jobId}. ${result.message || ''}`, 'success');
        setCurrentJobId(result.jobId);
        setIsMonitoring(true); // Start monitoring state

        const newIntervalId = setInterval(async () => {
          if (!isMonitoringRef.current || currentJobIdRef.current !== result.jobId) {
            logMessage(`Polling stopped for ${result.jobId} as monitoring state or job ID changed.`);
            clearInterval(newIntervalId);
            setPollingIntervalId(null);
            setIsMonitoring(false); 
            return;
          }
          try {
            logMessage(`Polling status for Job ID: ${result.jobId}...`);
            const statusResult: IngestJobStatus = await localUtility.getJobStatus(result.jobId);
            logMessage(`Agent reported status for Job ${result.jobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
            setIngestionSummary(statusResult);
            
            if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
              clearInterval(newIntervalId);
              setPollingIntervalId(null);
              setIsMonitoring(false); 
              logMessage(`Ingestion job ${result.jobId} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
              
              if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
                const shotsToUpdateCount = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
                const eventIdForUpdate = statusResult.determinedEventId || selectedEventId; // Prefer agent determined event
                const photographerIdForUpdate = statusResult.determinedPhotographerId || selectedPhotographerId; // Prefer agent determined photographer

                if (shotsToUpdateCount > 0 && eventIdForUpdate && photographerIdForUpdate) {
                  const eventNameForLog = getEventById(eventIdForUpdate)?.name || eventIdForUpdate;
                  const photographerNameForLog = initialPersonnelMock.find(p=>p.id === photographerIdForUpdate)?.name || photographerIdForUpdate;

                  logMessage(`Updating up to ${shotsToUpdateCount} shot requests in HIVE for event "${eventNameForLog}" by ${photographerNameForLog}...`);
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
                      logMessage(`HIVE status updated for shot: "${shotToUpdate.description.substring(0,30)}..." to Captured by ${photographerNameForLog}.`);
                      shotsActuallyUpdatedCount++;
                    }
                  }
                  setIngestionSummary(prev => prev ? {...prev, filesMatchedToEvents: shotsActuallyUpdatedCount } : { jobId: result.jobId, status: 'completed', filesMatchedToEvents: shotsActuallyUpdatedCount });
                  if (shotsActuallyUpdatedCount > 0) {
                      toast({ title: "HIVE Shot Statuses Updated", description: `${shotsActuallyUpdatedCount} shot requests for event "${eventNameForLog}" marked as 'Captured'.`});
                  } else {
                      logMessage("No uncaptured shot requests were available in HIVE to update for this event, or agent reported 0 files processed/matched.");
                  }
                } else {
                   logMessage("Agent reported 0 files processed/matched for HIVE update, or no value provided. No HIVE shot statuses updated.");
                }
              }
            }
          } catch (statusError: any) {
            logMessage(`Error polling job status for ${result.jobId} from local agent: ${statusError.message || String(statusError)}`, 'error');
            if (newIntervalId) clearInterval(newIntervalId);
            setPollingIntervalId(null);
            setIsMonitoring(false); 
            toast({ title: 'Polling Error', description: `Could not get status for job ${result.jobId}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
          }
        }, 5000);
        setPollingIntervalId(newIntervalId);

      } else {
        logMessage(`Failed to start job with local agent. Agent response: ${JSON.stringify(result)}`, 'error');
        toast({ title: "Job Start Failed", description: result?.message || "Local agent did not return a Job ID.", variant: "destructive" });
      }
    } catch (error: any) {
      logMessage(`Error starting ingestion job with local agent: ${error.message || String(error)}`, 'error');
      toast({ title: "Error Starting Job", description: error.message || "Could not communicate with local agent.", variant: "destructive" });
    } finally {
      setIsStartingJob(false);
    }
  };
  
  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle; // Default Icon
    let textColor = "text-muted-foreground";
    let iconColor = "text-muted-foreground"; // For the icon color
    let statusText = "Unknown";

    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = Power;
        textColor = "text-green-600 dark:text-green-400";
        iconColor = textColor; // Green icon
        statusText = "Connected";
        break;
      case 'disconnected':
        IconComponent = PowerOff;
        textColor = "text-red-600 dark:text-red-400";
        iconColor = textColor; // Red icon
        statusText = "Disconnected";
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        iconColor = textColor; // Yellow icon
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
    if (!selectedEventDetails || !selectedPhotographerDetails) return "[Select Event & Photographer in HIVE to see example structure]";
    
    const eventDateFormatted = selectedEventDetails.date ? format(new Date(selectedEventDetails.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = selectedEventDetails.name.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 30);
    const photographerNameSanitized = selectedPhotographerDetails.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const projectNameSanitized = selectedProject ? selectedProject.name.replace(/[^a-zA-Z0-9_.-]/g, '_') : 'PROJECT_NAME';
    
    return `[Your_Root_Destination_Path_Selected_In_Local_Utility]/${projectNameSanitized}/CAPTURE/${eventDateFormatted}/${eventNameSanitized}/${photographerNameSanitized}/`;
  }, [selectedPhotographerDetails, selectedEventDetails, selectedProject]);
  
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
          The Ingestion Utility relies on HIVE demo data for context (events, personnel) for its UI displays. Please enable "Load Demo Data" in Settings for full UI functionality.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Ingestion Job Utility
        </h1>
        <AgentStatusIndicator />
      </div>
      
      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Select the "Active Photographer" and "Target Event" in HIVE to set the context for this ingestion job.</p>
            <p>2. Enter the conceptual Source, Working, and Backup paths for the local agent to use. These are for reference and will be sent to the agent.</p>
            <p>3. Click "Start Ingestion Job". HIVE will send these details to your local desktop agent.</p>
            <p>4. **The local agent will then present its own UI** for you to confirm/select the actual file paths and start the ingestion.</p>
            <p>5. Once the local agent starts, it will return a Job ID to HIVE, and HIVE will begin monitoring the job status.</p>
        </AlertDescription>
      </Alert>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Job Setup</CardTitle>
          <CardDescription>
            Select context in HIVE. The local agent will handle actual path selection and job execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="photographerSelect">Active Photographer (from HIVE)</Label>
                    <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={isStartingJob || isMonitoring || availablePhotographers.length === 0}>
                        <SelectTrigger id="photographerSelect">
                            <SelectValue placeholder="Select photographer..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availablePhotographers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            {availablePhotographers.length === 0 && <p className="p-2 text-xs text-muted-foreground">No photographers with camera serials found.</p>}
                        </SelectContent>
                    </Select>
                    {selectedPhotographerDetails && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <ScanLine className="h-3.5 w-3.5" /> 
                            HIVE Camera S/N(s): {(selectedPhotographerDetails.cameraSerials || []).join(', ') || "Not specified"}
                        </p>
                    )}
                </div>
                <div>
                    <Label htmlFor="eventSelect">Target Event (from HIVE)</Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isStartingJob || isMonitoring || availableEvents.length === 0 || !selectedProject}>
                        <SelectTrigger id="eventSelect">
                            <SelectValue placeholder={!selectedProject ? "Select a project first" : "Select event..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableEvents.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.date})</SelectItem>)}
                            {selectedProject && availableEvents.length === 0 && <p className="p-2 text-xs text-muted-foreground">No covered events for selected project.</p>}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourcePath1">Source Path 1 (Conceptual - for Local Agent)</Label>
              <div className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-muted-foreground" />
                <Input id="sourcePath1" value={sourcePath1} onChange={(e) => setSourcePath1(e.target.value)} placeholder="e.g., /Volumes/SD_Card_1" disabled={isStartingJob || isMonitoring} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourcePath2">Source Path 2 (Optional)</Label>
               <div className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-muted-foreground" />
                <Input id="sourcePath2" value={sourcePath2} onChange={(e) => setSourcePath2(e.target.value)} placeholder="e.g., /Volumes/SD_Card_2" disabled={isStartingJob || isMonitoring} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workingPath">Working Destination Path (Conceptual)</Label>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input id="workingPath" value={workingPath} onChange={(e) => setWorkingPath(e.target.value)} placeholder="e.g., /Volumes/RAID/Project_Working" disabled={isStartingJob || isMonitoring} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backupPath">Backup Destination Path (Optional)</Label>
               <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input id="backupPath" value={backupPath} onChange={(e) => setBackupPath(e.target.value)} placeholder="e.g., //NAS/Project_Backup" disabled={isStartingJob || isMonitoring} />
              </div>
            </div>
             <p className="text-xs text-muted-foreground mt-1">The local agent will use these paths as suggestions but will typically present its own UI for final path selection.</p>
        </CardContent>
        <CardFooter>
            <Button 
              onClick={handleStartIngestion} 
              disabled={isStartingJob || isMonitoring || agentConnectionStatus !== 'connected' || !selectedPhotographerId || !selectedEventId || !sourcePath1.trim() || !workingPath.trim()}
            >
             {(isStartingJob || isMonitoring) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
             {isStartingJob ? "Initiating with Agent..." : (isMonitoring ? `Monitoring Job: ${currentJobId}` : "Start Ingestion Job")}
            </Button>
        </CardFooter>
      </Card>

      {isMonitoring && currentJobId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>Actively polling local agent for Job ID: <span className="font-semibold text-foreground">{currentJobId}</span>.</span>
        </div>
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
             <p className="text-xs text-muted-foreground pt-2">HIVE Shot Requests Updated: {ingestionSummary.status === 'completed' && selectedEventId && selectedPhotographerId ? (ingestionSummary.filesMatchedToEvents ?? ingestionSummary.filesProcessed ?? 0) : "0 (pending agent completion or HIVE context)"}</p>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This report is based on the latest status from the local agent. HIVE updates its internal shot statuses based on the agent&apos;s report for files matched to the event context set in HIVE.</p>
          </CardFooter>
        </Card>
      )}
      
      <div className="space-y-4">
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-base">Expected Folder Structure (Reference for Local Agent)</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
                <p className="text-xs text-muted-foreground mt-1">Your local agent should be configured to create a folder structure similar to this, using the Photographer and Event context selected in HIVE, and the destination path chosen in the local agent's UI.</p>
            </CardContent>
        </Card>
       </div>
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page sends instructions to and monitors your **separate local desktop agent application**. The local agent handles all file selection (using its own UI), path specification, copying, checksums, metadata parsing, and folder creation. HIVE updates its records based on the agent&apos;s reports.
        </AlertDescription>
      </Alert>
    </div>
  );
}

