
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, HelpCircle } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData, type ShotRequest } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

interface PhotographerInfoForAgent { // Matches agent's expected PhotographerInfo
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    // preferredRawFormat?: RawFormat; // Assuming RawFormat is a string or enum
    notes?: string;
}


export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, getShotRequestsForEvent, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>(""); 

  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');

  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(
      p => p.cameraSerial && p.role === "Photographer"
    );
  }, []);

  const selectedPhotographerDetails = useMemo(() => {
    return initialPersonnelMock.find(p => p.id === selectedPhotographerId);
  }, [selectedPhotographerId]);

  const relevantEvents = useMemo(() => {
    if (!selectedProject) return [];
    return eventsForSelectedProjectAndOrg.filter(event => event.isCovered);
  }, [selectedProject, eventsForSelectedProjectAndOrg]);
  
  const selectedEventDetails = useMemo(() => {
    return relevantEvents.find(e => e.id === selectedEventId);
  }, [selectedEventId, relevantEvents]);

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'INFO: ';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const verifyAgentConnection = useCallback(async () => {
    setAgentConnectionStatus('checking');
    logMessage("Verifying connection to local agent...");
    try {
      await localUtility.getAvailableDrives(); 
      setAgentConnectionStatus('connected');
      logMessage("Successfully connected to local agent.", 'success');
      toast({ title: "Agent Connected", description: "Successfully connected to the local ingestion agent." });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAgentConnectionStatus('disconnected');
      logMessage(`Failed to connect to local agent: ${errorMessage}`, 'error');
      toast({ title: "Agent Connection Failed", description: `Could not connect to local agent. ${errorMessage}`, variant: "destructive" });
      return false;
    }
  }, [logMessage, toast]);

  useEffect(() => {
    verifyAgentConnection();
    return () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pollingIntervalId && (!selectedPhotographerId || !selectedEventId)) {
      logMessage("HIVE context (Photographer/Event) changed or cleared. Stopping current job monitoring.", "info");
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setCurrentJobId(null); 
      setJobIdToMonitorInput("");
      setIsMonitoring(false);
      setIngestionSummary(null);
    }
  }, [selectedPhotographerId, selectedEventId, pollingIntervalId, logMessage]);


  const handleSignalAgent = async () => {
    if (!selectedPhotographerId || !selectedEventId) {
      toast({
        title: 'Missing HIVE Context',
        description: 'Please select Photographer and Event in HIVE to provide context for the local agent.',
        variant: 'destructive',
      });
      return;
    }
    if (!(await verifyAgentConnection())) {
      toast({ title: 'Agent Not Connected', description: 'Cannot signal agent. Please ensure it is running and HIVE is connected.', variant: 'destructive'});
      return;
    }

    setIngestionLog([]);
    setIngestionSummary(null);
    setCurrentJobId(null);
    setJobIdToMonitorInput("");
    setIsMonitoring(false);
    if(pollingIntervalId) clearInterval(pollingIntervalId);
    setPollingIntervalId(null);

    logMessage(`Signaling Local Agent (HIVE Context Provided):`);
    logMessage(`  Photographer: ${selectedPhotographerDetails?.name} (ID: ${selectedPhotographerId}, S/N: ${selectedPhotographerDetails?.cameraSerial || 'N/A'})`);
    logMessage(`  Event: ${selectedEventDetails?.name} (ID: ${selectedEventId}, Date: ${selectedEventDetails?.date})`);
    logMessage(`Please switch to your local ingestion utility/agent. Use its interface to select source/destination paths and start the ingestion process.`);
    logMessage(`Once the local agent starts the job and provides a Job ID, enter that Job ID below and click "Start Monitoring Job".`);
    
    toast({
      title: "Local Agent Signaled",
      description: "Open your local ingestion utility to select paths & start the job, then enter its Job ID here to monitor.",
      duration: 15000,
    });
  };

  const startMonitoringJob = async () => {
    const jobIdToUse = jobIdToMonitorInput.trim();
    if (!jobIdToUse) {
      toast({ title: "Missing Job ID", description: "Please enter the Job ID provided by your local agent.", variant: "destructive" });
      return;
    }
     if (!(await verifyAgentConnection())) {
      toast({ title: 'Agent Not Connected', description: 'Cannot monitor. Please ensure the local agent is running and HIVE is connected.', variant: 'destructive'});
      return;
    }
     if (!selectedEventId || !selectedPhotographerId) {
        toast({ title: "Missing HIVE Context", description: "Photographer and Event must be selected in HIVE before monitoring can begin.", variant: "destructive" });
        return;
    }

    setCurrentJobId(jobIdToUse);
    setIsMonitoring(true);
    setIngestionSummary(null); 
    logMessage(`Starting to monitor Job ID from local agent: ${jobIdToUse}`);
    
    const interval = setInterval(async () => {
      // Use a fresh check for currentJobId from state inside interval to allow stopping
      if (!currentJobId && !jobIdToUse) { 
          clearInterval(interval);
          setPollingIntervalId(null);
          logMessage("Monitoring stopped: No current Job ID.", "info");
          return;
      }
      const effectiveJobId = currentJobId || jobIdToUse;
       if (!effectiveJobId) {
            clearInterval(interval);
            setPollingIntervalId(null);
            logMessage("Monitoring stopped: Effective Job ID became null.", "info");
            return;
        }

      try {
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(effectiveJobId);
        logMessage(`Agent reported status for Job ${effectiveJobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
        setIngestionSummary(statusResult); // Keep summary updated with latest status

        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          if(pollingIntervalId) clearInterval(pollingIntervalId); // Clear interval from state
          setPollingIntervalId(null); // Nullify state
          setIsMonitoring(false);
          // currentJobId remains set to show in summary until next job or context change
          logMessage(`Ingestion job ${effectiveJobId} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
          
          if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
            toast({ title: 'Ingestion Complete (Agent)', description: statusResult.message || `Job ${effectiveJobId} processed by local agent. Updating HIVE shot statuses...` });

            let shotsUpdatedCount = 0;
            const allShotsForEvent: ShotRequest[] = getShotRequestsForEvent(selectedEventId);
            const updatableShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
            
            // Use filesMatchedToEvents from agent if available, otherwise filesProcessed, fallback to 0
            const filesToConsiderForShotUpdate = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
            const shotsToUpdateCount = Math.min(updatableShots.length, filesToConsiderForShotUpdate);

            if (shotsToUpdateCount > 0) {
              logMessage(`Updating ${shotsToUpdateCount} shot requests in HIVE for event "${selectedEventDetails?.name}" based on agent report for Job ${effectiveJobId}...`);
              for (let i = 0; i < shotsToUpdateCount; i++) {
                const shot = updatableShots[i];
                const updatePayload: Partial<ShotRequestFormData> = {
                  status: 'Captured',
                  initialCapturerId: selectedPhotographerId,
                  lastStatusModifierId: selectedPhotographerId,
                  lastStatusModifiedAt: new Date().toISOString(),
                };
                try {
                  updateShotRequest(selectedEventId, shot.id, updatePayload);
                  logMessage(`HIVE status updated for shot: "${shot.description.substring(0,30)}..." to Captured.`);
                  shotsUpdatedCount++;
                } catch (hiveError: any) {
                  logMessage(`HIVE Error updating shot "${shot.description.substring(0,30)}...": ${hiveError.message || String(hiveError)}`, 'error');
                }
              }
               // Update summary with actual HIVE updates if different from agent's report
              setIngestionSummary(prev => prev ? {...prev, filesMatchedToEvents: shotsUpdatedCount} : null);
              if (shotsUpdatedCount > 0) {
                toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCount} shot requests for event "${selectedEventDetails?.name}" marked as 'Captured'.`});
              }
            } else {
              logMessage(`No updatable shots found in HIVE for event "${selectedEventDetails?.name}" or agent reported no relevant files processed for Job ${effectiveJobId}.`);
            }
          } else if (statusResult.status === 'failed' || statusResult.status === 'cancelled') {
            toast({ title: `Ingestion ${statusResult.status} for Job ${effectiveJobId}`, description: statusResult.message || `Local agent reported ${statusResult.status}.`, variant: 'destructive' });
          }
        }
      } catch (statusError: any) {
        logMessage(`Error polling job status for ${effectiveJobId}: ${statusError.message || String(statusError)}`, 'error');
        if(pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false);
        // Keep currentJobId so user knows which job failed polling
        toast({ title: 'Polling Error', description: `Could not get status for job ${effectiveJobId}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 5000); // Poll every 5 seconds
    setPollingIntervalId(interval);
  };
  
  const expectedFolderPath = useMemo(() => {
    if (!selectedEventDetails || !selectedPhotographerDetails || !selectedProject) return "[Select Project, Event & Photographer in HIVE for reference]";
    const eventDate = selectedEventDetails.date ? format(new Date(selectedEventDetails.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = selectedEventDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const photographerNameSanitized = selectedPhotographerDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,15) || 'PHOTOG';
    const projectNameSanitized = selectedProject.name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    return `[Your_Root_Destination_Path]/CLIENT_XYZ/${projectNameSanitized}/CAPTURE/${eventDate}/${selectedEventDetails.id.substring(0,4)}_${eventNameSanitized}/${photographerNameSanitized}/`;
  }, [selectedEventDetails, selectedPhotographerDetails, selectedProject]);

  if (isLoadingSettings || isLoadingEvents) {
    return <div className="p-4">Loading ingestion utility settings...</div>;
  }
  if (!useDemoData && !isLoadingSettings) {
     return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Data Disabled</AlertTitle>
        <AlertDescription>
          The Ingestion Utility relies on demo data for photographers and events. Please enable "Load Demo Data" in Settings to use this feature.
        </AlertDescription>
      </Alert>
    );
  }
  if (!selectedProject && useDemoData) {
    return (
         <Alert variant="default" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the main header. This provides context (like Event list) for the Ingestion Utility.
          </AlertDescription>
        </Alert>
    );
  }

  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle;
    let textColor = "text-muted-foreground";
    let bgColor = "bg-gray-400";
    let statusText = "Unknown";

    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = CheckCircle;
        textColor = "text-green-600 dark:text-green-400";
        bgColor = "bg-green-500";
        statusText = "Connected";
        break;
      case 'disconnected':
        IconComponent = XCircle;
        textColor = "text-red-600 dark:text-red-400";
        bgColor = "bg-red-500";
        statusText = "Disconnected";
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        bgColor = "bg-yellow-500";
        statusText = "Checking...";
        break;
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "h-3 w-3 rounded-full",
            bgColor,
            agentConnectionStatus === 'checking' && "animate-pulse"
          )}
          aria-hidden="true"
        />
        <span className={textColor}>{statusText}</span>
        <Button variant="ghost" size="sm" onClick={verifyAgentConnection} className="h-7 px-2 py-1 text-xs" title="Refresh Connection Status" disabled={agentConnectionStatus === 'checking'}>
           <RefreshCw className={cn("h-3.5 w-3.5", agentConnectionStatus === 'checking' && "animate-spin")} />
        </Button>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Swift Ingestion Utility
        </h1>
        <AgentStatusIndicator />
      </div>
       <p className="text-muted-foreground -mt-6">
          Set HIVE context, then use your local desktop agent (which handles path selection and starts the job). Enter the Job ID from the agent below to monitor.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 1: Set HIVE Context & Prepare Local Agent</CardTitle>
          <CardDescription>
            Select the Photographer and Event this ingestion batch relates to in HIVE. HIVE will display an example folder structure for the local agent's reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer (HIVE Context)</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={isMonitoring}>
                <SelectTrigger id="photographer-select">
                  <SelectValue placeholder="Select photographer..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePhotographers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                  {availablePhotographers.length === 0 && <p className="p-2 text-xs text-muted-foreground">No photographers with camera S/N found in HIVE.</p>}
                </SelectContent>
              </Select>
              {selectedPhotographerDetails && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ScanLine className="h-3.5 w-3.5" />
                  HIVE Camera S/N: {selectedPhotographerDetails.cameraSerial || "Not specified"} (Local agent can verify image EXIF against this)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="event-select">Target Event (HIVE Context)</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isMonitoring || !selectedProject || relevantEvents.length === 0}>
                <SelectTrigger id="event-select">
                  <SelectValue placeholder={selectedProject ? (relevantEvents.length > 0 ? "Select event..." : "No covered events for project") : "Select a project first"} />
                </SelectTrigger>
                <SelectContent>
                  {relevantEvents.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({event.date})
                    </SelectItem>
                  ))}
                  {selectedProject && relevantEvents.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">No covered events for this project.</p>
                  )}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground mt-1">Local agent can use image timestamps to cross-reference with this event's schedule.</p>
            </div>
            <Button onClick={handleSignalAgent} disabled={!selectedPhotographerId || !selectedEventId || isMonitoring || agentConnectionStatus !== 'connected'}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Signal Local Agent & Prepare for Monitoring
            </Button>
            {agentConnectionStatus !== 'connected' && (
              <p className="text-sm text-destructive">Local agent not connected. Cannot signal.</p>
            )}
             <div className="mt-1 text-sm p-3 border rounded-md bg-muted/30">
              <p className="font-medium text-foreground mb-1 text-xs">Local Agent Expected Folder Structure (Example Reference):</p>
              <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobIdInput">Step 2: Enter Job ID from Local Agent</Label>
              <Input 
                id="jobIdInput" 
                value={jobIdToMonitorInput} 
                onChange={(e) => setJobIdToMonitorInput(e.target.value)} 
                placeholder="Paste Job ID here after starting job in local agent" 
                disabled={isMonitoring || !selectedPhotographerId || !selectedEventId}
                className="font-mono"
              />
            </div>
            <Button onClick={startMonitoringJob} disabled={!jobIdToMonitorInput.trim() || isMonitoring || agentConnectionStatus !== 'connected' || !selectedEventId || !selectedPhotographerId}>
              {isMonitoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
              {isMonitoring ? `Monitoring Job: ${currentJobId ? currentJobId.substring(0,12)+(currentJobId.length > 12 ? '...' : '') : 'Active...'}` : "Start Monitoring Job"}
            </Button>
            {isMonitoring && currentJobId && <p className="text-xs text-muted-foreground mt-1">Currently monitoring Job ID: {currentJobId}</p>}
             <Alert variant="default" className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Local Agent Workflow</AlertTitle>
                <AlertDescription className="text-xs">
                    1. After clicking "Signal Local Agent", open your separate local desktop ingestion utility.
                    2. Use its interface to select your source media folders and destination paths.
                    3. Start the ingestion process within the local utility.
                    4. The local utility will provide you with a unique Job ID.
                    5. Paste that Job ID into the field above and click "Start Monitoring Job". HIVE will then poll the local agent for status.
                </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {(ingestionLog.length > 0 || isMonitoring) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log</CardTitle>
            {currentJobId && <CardDescription>Monitoring Job ID: {currentJobId}</CardDescription>}
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
             {ingestionSummary.jobId && <CardDescription>Job ID: {ingestionSummary.jobId}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Overall Status: <span className="font-semibold">{ingestionSummary.status}</span></p>
            <p>Agent Message: <span className="font-semibold">{ingestionSummary.message || "N/A"}</span></p>
            <p>Total Files Detected by Agent: <span className="font-semibold">{ingestionSummary.totalFiles ?? "N/A"}</span></p>
            <p>Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed ?? "N/A"}</span></p>
            <p>Files Matched by Agent: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span></p>
            <p>Files Unmatched by Agent: <span className="font-semibold">{ingestionSummary.filesUnmatched ?? "N/A"}</span></p>
            <p>Total Size (Agent): <span className="font-semibold">{ingestionSummary.totalSizeMB ?? "N/A"} MB</span></p>
            <p>HIVE Shot Requests Updated: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span> (Based on agent's matched/processed files)</p>
            <p>
              Agent Checksum Status: <span className="font-semibold">{ingestionSummary.checksumResult || "N/A"}</span>
               {(ingestionSummary.checksumResult?.toLowerCase().includes('pass') || ingestionSummary.checksumResult?.toLowerCase().includes('verified')) ? (
                <CheckCircle className="inline ml-1 h-4 w-4 text-green-500" />
              ) : ingestionSummary.checksumResult && !ingestionSummary.checksumResult.toLowerCase().includes('pending') && !ingestionSummary.checksumResult.toLowerCase().includes('n/a') ? (
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
                        {ingestionSummary.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This report is based on the latest status from the local agent. HIVE updates its internal shot statuses based on the agent's report for successfully matched/processed files.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required for File Operations</AlertTitle>
        <AlertDescription className="text-xs">
          HIVE sets the context (Photographer, Event) and monitors jobs. You must use your separate **local HIVE desktop agent application** to select actual file paths, start the ingestion, and obtain a Job ID. Enter that Job ID back into this HIVE page to monitor progress and update HIVE shot statuses based on the agent's report. The local agent performs all file copying, checksums, and folder creation.
        </AlertDescription>
      </Alert>
    </div>
  );
}
