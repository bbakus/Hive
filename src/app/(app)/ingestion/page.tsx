
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, HelpCircle } from 'lucide-react'; // Removed FolderInput, HardDrive for now
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData, type ShotRequest } from '@/contexts/EventContext'; // Added ShotRequest
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

// This interface might be simplified if only path is needed, or expanded if local agent provides more
interface DriveInfo {
  path: string;
  [key: string]: any;
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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null); // Job ID being actively monitored
  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>(""); // User input for Job ID to monitor

  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [ingestionSummary, setIngestionSummary] = useState<{
    filesProcessed: number;
    filesMatchedToEvents: number;
    filesUnmatched: number;
    totalSizeMB: number;
    checksumStatus: string;
    finalMessage?: string;
    errors?: string[];
    reportUrl?: string;
  } | null>(null);

  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  // availableDrives state is removed as per the new flow where local utility handles path selection

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
    // Clear job monitoring if photographer or event context changes
    if (pollingIntervalId) {
      logMessage("HIVE context (Photographer/Event) changed. Stopping current job monitoring.", "info");
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setCurrentJobId(null); 
      setJobIdToMonitorInput(""); // Clear input as well
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
      toast({ title: 'Agent Not Connected', description: 'Cannot signal agent. Please ensure it is running.', variant: 'destructive'});
      return;
    }

    // Clear previous job states
    setIngestionLog([]);
    setIngestionSummary(null);
    setCurrentJobId(null);
    setJobIdToMonitorInput("");
    setIsMonitoring(false);
    if(pollingIntervalId) clearInterval(pollingIntervalId);
    setPollingIntervalId(null);

    logMessage(`Signaling Local Agent for Ingestion (HIVE Context):`);
    logMessage(`  Photographer: ${selectedPhotographerDetails?.name} (ID: ${selectedPhotographerId}, S/N: ${selectedPhotographerDetails?.cameraSerial || 'N/A'})`);
    logMessage(`  Event: ${selectedEventDetails?.name} (ID: ${selectedEventId}, Date: ${selectedEventDetails?.date})`);
    logMessage(`Please switch to your local ingestion utility/agent. Use its interface to select source/destination paths and start the ingestion process.`);
    logMessage(`Once the local agent starts the job, it will provide a Job ID. Enter that Job ID below and click "Start Monitoring Job".`);
    
    toast({
      title: "Local Agent Signaled",
      description: "Open your local ingestion utility to select paths & start the job, then enter its Job ID here.",
      duration: 15000, // Longer duration for this important instruction
    });
  };

  const startMonitoringJob = async () => {
    if (!jobIdToMonitorInput.trim()) {
      toast({ title: "Missing Job ID", description: "Please enter the Job ID provided by your local agent.", variant: "destructive" });
      return;
    }
     if (!(await verifyAgentConnection())) {
      toast({ title: 'Agent Not Connected', description: 'Cannot monitor. Please ensure the local agent is running.', variant: 'destructive'});
      return;
    }
     if (!selectedEventId || !selectedPhotographerId) {
        toast({ title: "Missing HIVE Context", description: "Photographer and Event must be selected in HIVE before monitoring.", variant: "destructive" });
        return;
    }


    const jobIdToUse = jobIdToMonitorInput.trim();
    setCurrentJobId(jobIdToUse); // Store the job ID being actively monitored
    setIsMonitoring(true);
    setIngestionSummary(null); // Clear previous summary
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: INFO: Starting to monitor Job ID: ${jobIdToUse}`, ...prev].slice(0,100));
    
    const interval = setInterval(async () => {
      if (!currentJobId && !jobIdToUse) { // Check if monitoring was stopped
          clearInterval(interval);
          setPollingIntervalId(null);
          return;
      }
      try {
        // Use currentJobId from state for safety in closure, or jobIdToUse if currentJobId isn't set yet (should be rare)
        const effectiveJobId = currentJobId || jobIdToUse; 
        if (!effectiveJobId) {
            clearInterval(interval);
            setPollingIntervalId(null);
            return;
        }

        const statusResult: IngestJobStatus = await localUtility.getJobStatus(effectiveJobId);
        logMessage(`Agent reported status for Job ${effectiveJobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress || 0}%)`);

        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          clearInterval(interval);
          setPollingIntervalId(null);
          setIsMonitoring(false);
          // Don't clear currentJobId here, keep it for the summary
          logMessage(`Ingestion job ${effectiveJobId} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
          
          setIngestionSummary({
            filesProcessed: statusResult.filesProcessed || 0,
            filesMatchedToEvents: statusResult.filesMatchedToEvents || 0,
            filesUnmatched: statusResult.filesUnmatched || 0,
            totalSizeMB: statusResult.totalSizeMB || 0,
            checksumStatus: statusResult.checksumResult || "N/A",
            finalMessage: statusResult.message,
            errors: statusResult.errors,
            reportUrl: statusResult.reportUrl
          });

          if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
            toast({ title: 'Ingestion Complete (Agent)', description: statusResult.message || `Job ${effectiveJobId} processed by local agent. Updating HIVE shot statuses...` });

            let shotsUpdatedCount = 0;
            // Use getShotRequestsForEvent to fetch current shots for the selected event
            const allShotsForEvent: ShotRequest[] = getShotRequestsForEvent(selectedEventId);
            const updatableShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');

            const filesToConsiderForShotUpdate = statusResult.filesMatchedToEvents || statusResult.filesProcessed || 0;
            const shotsToUpdateCount = Math.min(updatableShots.length, filesToConsiderForShotUpdate);

            if (shotsToUpdateCount > 0) {
              logMessage(`Updating ${shotsToUpdateCount} shot requests in HIVE for event "${selectedEventDetails?.name}" based on agent report for Job ${effectiveJobId}...`);
              for (let i = 0; i < shotsToUpdateCount; i++) {
                const shot = updatableShots[i];
                const updatePayload: Partial<ShotRequestFormData> = {
                  status: 'Captured',
                  initialCapturerId: selectedPhotographerId,
                  lastStatusModifierId: selectedPhotographerId, // Assuming agent action implies this user
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
        logMessage(`Error polling job status for ${currentJobId || jobIdToUse}: ${statusError.message || String(statusError)}`, 'error');
        if(pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false);
        // Keep currentJobId so user knows which job failed polling
        toast({ title: 'Polling Error', description: `Could not get status for job ${currentJobId || jobIdToUse}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 5000);
    setPollingIntervalId(interval);
  };
  
  const expectedFolderPath = useMemo(() => {
    if (!selectedEventDetails || !selectedPhotographerDetails || !selectedProject) return "[Select Project, Event & Photographer in HIVE for reference]";
    const eventDate = selectedEventDetails.date ? format(new Date(selectedEventDetails.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = selectedEventDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const photographerNameSanitized = selectedPhotographerDetails.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'PHOTOG';
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
    let IconComponent = HelpCircle; // Default Icon
    let textColor = "text-muted-foreground";
    let bgColor = "bg-gray-400"; // Tailwind color for the circle
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
            agentConnectionStatus === 'checking' && "animate-pulse" // Optional: pulse effect while checking
          )}
          aria-hidden="true"
        />
        <span className={textColor}>{statusText}</span>
        <Button variant="ghost" size="sm" onClick={verifyAgentConnection} className="h-7 px-2 py-1 text-xs" title="Refresh Connection Status">
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
          Set HIVE context, then use your local desktop agent to select paths and start ingestion. Enter the Job ID from the agent below to monitor.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 1: Set HIVE Context & Prepare Local Agent</CardTitle>
          <CardDescription>
            Select the Photographer and Event this ingestion batch relates to in HIVE. HIVE will display an example folder structure.
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
                  HIVE Camera S/N (for agent reference): {selectedPhotographerDetails.cameraSerial || "Not specified"}
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
            </div>
            <Button onClick={handleSignalAgent} disabled={!selectedPhotographerId || !selectedEventId || isMonitoring || agentConnectionStatus !== 'connected'}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Signal Local Agent & Prepare for Monitoring
            </Button>
            {agentConnectionStatus !== 'connected' && (
              <p className="text-sm text-destructive">Local agent not connected. Cannot signal.</p>
            )}
             <div className="mt-1 text-sm p-3 border rounded-md bg-muted/30">
              <p className="font-medium text-foreground mb-1 text-xs">Local Agent Expected Folder Structure (Example):</p>
              <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
              <p className="text-xs text-muted-foreground mt-1">Your local agent should be configured to create a similar structure within its chosen working/backup destinations.</p>
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
                disabled={isMonitoring}
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
                    5. Paste that Job ID into the field above and click "Start Monitoring Job".
                </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {(ingestionLog.length > 0 || isMonitoring) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log</CardTitle>
            {currentJobId && <CardDescription>Job ID: {currentJobId}</CardDescription>}
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
             {currentJobId && <CardDescription>Job ID: {currentJobId}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed}</span></p>
            <p>Files Matched by Agent: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents}</span></p>
            <p>Files Unmatched by Agent: <span className="font-semibold">{ingestionSummary.filesUnmatched}</span></p>
            <p>Total Size (Agent): <span className="font-semibold">{ingestionSummary.totalSizeMB} MB</span></p>
            <p>HIVE Shot Requests Updated: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents}</span> (Based on agent's matched files)</p>
            <p>
              Agent Checksum Status: <span className="font-semibold">{ingestionSummary.checksumStatus}</span>
               {ingestionSummary.checksumStatus?.toLowerCase().includes('pass') || ingestionSummary.checksumStatus?.toLowerCase().includes('verified') ? (
                <CheckCircle className="inline ml-1 h-4 w-4 text-green-500" />
              ) : ingestionSummary.checksumStatus && !ingestionSummary.checksumStatus.toLowerCase().includes('pending') && !ingestionSummary.checksumStatus.toLowerCase().includes('n/a') ? (
                <XCircle className="inline ml-1 h-4 w-4 text-red-500" />
              ) : null}
            </p>
            {ingestionSummary.reportUrl && (
                <p>Agent Report: <a href={ingestionSummary.reportUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">{ingestionSummary.reportUrl}</a></p>
            )}
            {ingestionSummary.finalMessage && (
                <p className="text-xs text-muted-foreground">Agent Final Message: {ingestionSummary.finalMessage}</p>
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
            <p className="text-xs text-muted-foreground">This report is based on responses from the local agent. HIVE updates its internal shot statuses based on the agent's report for successfully matched files.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required for File Operations</AlertTitle>
        <AlertDescription>
          HIVE sets the context (Photographer, Event). You must then use your separate **local HIVE desktop agent application** to select actual file paths, start the ingestion, and obtain a Job ID. Enter that Job ID back into this HIVE page to monitor progress and update HIVE shot statuses based on the agent's report. The local agent performs all file copying, checksums, and folder creation.
        </AlertDescription>
      </Alert>
    </div>
  );
}
    
    
 
  