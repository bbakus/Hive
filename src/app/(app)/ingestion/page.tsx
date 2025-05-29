
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, HelpCircle, FolderInput, HardDrive } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData, type ShotRequest } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus } from '@/services/localUtility'; // Assuming localUtility still defines IngestJobStatus
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

interface PhotographerInfoForAgent {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    notes?: string;
}

interface DriveInfo {
  path: string;
  [key: string]: any; // To allow for other properties like available, freeSpace etc.
}


export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null); // Job ID received from local agent via user input
  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>(""); 

  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [availablePaths, setAvailablePaths] = useState<DriveInfo[]>([]);


  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(
      p => p.cameraSerial && p.role === "Photographer"
    );
  }, []);

  const selectedPhotographerDetails = useMemo(() => {
    return initialPersonnelMock.find(p => p.id === selectedPhotographerId);
  }, [selectedPhotographerId]);

  const relevantEvents = useMemo(() => {
    if (!selectedProject || !eventsForSelectedProjectAndOrg) return [];
    return eventsForSelectedProjectAndOrg.filter(event => event.isCovered);
  }, [selectedProject, eventsForSelectedProjectAndOrg]);
  
  const selectedEventDetails = useMemo(() => {
    if (!selectedEventId || !relevantEvents) return null;
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
      toast({ title: "Agent Connection Failed", description: `Could not connect to local agent. Error: ${errorMessage}`, variant: "destructive" });
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
    if (pollingIntervalId && (!selectedPhotographerId || !selectedEventId || !currentJobId)) {
        logMessage("HIVE context or Job ID changed/cleared. Stopping current job monitoring.", "info");
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setIsMonitoring(false);
        // Do not clear currentJobId here if we want to show summary of last monitored job
    }
  }, [selectedPhotographerId, selectedEventId, currentJobId, pollingIntervalId, logMessage]);


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
    // setCurrentJobId(null); // Keep currentJobId if user wants to re-monitor an old job ID perhaps? Or clear it? Let's clear for new signal.
    // setJobIdToMonitorInput(""); // This is the user input field, should be cleared.
    setIsMonitoring(false);
    if(pollingIntervalId) clearInterval(pollingIntervalId);
    setPollingIntervalId(null);

    logMessage(`Signaling Local Agent (HIVE Context Provided):`);
    logMessage(`  Photographer: ${selectedPhotographerDetails?.name} (ID: ${selectedPhotographerId}, S/N: ${selectedPhotographerDetails?.cameraSerial || 'N/A'})`);
    logMessage(`  Event: ${selectedEventDetails?.name} (ID: ${selectedEventId}, Date: ${selectedEventDetails?.date})`);
    logMessage(`Please switch to your local ingestion utility/agent. Use its interface to select paths & start the ingestion process.`);
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

    setCurrentJobId(jobIdToUse); // Set the job ID we are actively monitoring
    setIsMonitoring(true);
    setIngestionSummary(null); 
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: INFO: Starting to monitor Job ID from local agent: ${jobIdToUse}`, ...prev].slice(0,100));
    
    const interval = setInterval(async () => {
      // Use a fresh check for currentJobId from state inside interval to allow stopping
      const currentJobIdForThisPoll = currentJobId; // Capture current state value

      if (!currentJobIdForThisPoll || !isMonitoring) { // Check isMonitoring flag as well
          if(pollingIntervalId === interval) { // Ensure we are clearing the correct interval
            clearInterval(interval);
            setPollingIntervalId(null);
          }
          logMessage("Monitoring stopped: No current Job ID or monitoring flag turned off.", "info");
          return;
      }

      try {
        // logMessage(`Polling status for Job ID: ${currentJobIdForThisPoll}`);
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(currentJobIdForThisPoll);
        logMessage(`Agent reported status for Job ${currentJobIdForThisPoll}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
        setIngestionSummary(statusResult);

        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          if(pollingIntervalId === interval) {
            clearInterval(interval);
            setPollingIntervalId(null);
          }
          setIsMonitoring(false);
          logMessage(`Ingestion job ${currentJobIdForThisPoll} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
          
          if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
            toast({ title: 'Ingestion Complete (Agent)', description: statusResult.message || `Job ${currentJobIdForThisPoll} processed by local agent. Updating HIVE shot statuses...` });

            const shotsToUpdateInHIVE = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
            if (shotsToUpdateInHIVE > 0) {
                logMessage(`Updating up to ${shotsToUpdateInHIVE} shot requests in HIVE for event "${selectedEventDetails?.name}"...`);
                const allShotsForEvent: ShotRequest[] = (eventsForSelectedProjectAndOrg.find(e=>e.id === selectedEventId)?.shotRequestsData || []); // Assuming shotRequestsData is now on Event
                const updatableShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                
                let shotsUpdatedCount = 0;
                for (let i = 0; i < Math.min(updatableShots.length, shotsToUpdateInHIVE); i++) {
                    const shot = updatableShots[i];
                    const updatePayload: Partial<ShotRequestFormData> = {
                    status: 'Captured',
                    initialCapturerId: selectedPhotographerId,
                    lastStatusModifierId: selectedPhotographerId, // Or a system ID for agent action
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
                setIngestionSummary(prev => prev ? {...prev, filesMatchedToEvents: shotsUpdatedCount} : { jobId: currentJobIdForThisPoll, status: 'completed', filesMatchedToEvents: shotsUpdatedCount });
                if (shotsUpdatedCount > 0) {
                    toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCount} shot requests for event "${selectedEventDetails?.name}" marked as 'Captured'.`});
                }
            } else {
                logMessage(`No updatable shots found in HIVE for event "${selectedEventDetails?.name}" or agent reported no relevant files processed for Job ${currentJobIdForThisPoll}.`);
            }

          } else if (statusResult.status === 'failed' || statusResult.status === 'cancelled') {
            toast({ title: `Ingestion ${statusResult.status} for Job ${currentJobIdForThisPoll}`, description: statusResult.message || `Local agent reported ${statusResult.status}.`, variant: 'destructive' });
          }
        }
      } catch (statusError: any) {
        logMessage(`Error polling job status for ${currentJobIdForThisPoll}: ${statusError.message || String(statusError)}`, 'error');
        if(pollingIntervalId === interval) {
            clearInterval(interval);
            setPollingIntervalId(null);
        }
        setIsMonitoring(false);
        toast({ title: 'Polling Error', description: `Could not get status for job ${currentJobIdForThisPoll}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 5000);
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

  const handleFetchAvailableDrives = async () => {
    if (!(await verifyAgentConnection())) return;
    logMessage("Fetching available drives from local agent...");
    try {
      const drives = await localUtility.getAvailableDrives();
      setAvailablePaths(drives.locations);
      logMessage(`Available drives fetched: ${drives.locations.map(l => l.path).join(', ')}`, "success");
      toast({ title: "Drives Fetched", description: "List of available drives retrieved from local agent." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error fetching available drives: ${errorMessage}`, "error");
      toast({ title: "Drive Fetch Failed", description: errorMessage, variant: "destructive" });
    }
  };

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
          <UploadCloud className="h-8 w-8 text-accent" /> HIVE Ingestion Monitor
        </h1>
        <AgentStatusIndicator />
      </div>
       <p className="text-muted-foreground -mt-6">
          Set HIVE context, then use your local desktop agent to start an ingestion job. Enter the Job ID from the agent below to monitor progress and update HIVE.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 1: Set HIVE Context for Monitoring</CardTitle>
          <CardDescription>
            Select the Photographer and Event this ingestion batch relates to. HIVE will update shot requests for this Event upon successful ingestion by the local agent.
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
                  HIVE Camera S/N: {selectedPhotographerDetails.cameraSerial || "Not specified"}
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
                Confirm Context & Prepare for Job ID
            </Button>
            {agentConnectionStatus !== 'connected' && !isMonitoring && (
              <p className="text-sm text-destructive">Local agent not connected. Cannot initiate monitoring.</p>
            )}
          </div>

          <div className="space-y-4">
             <div className="mt-1 text-sm p-3 border rounded-md bg-muted/30">
              <p className="font-medium text-foreground mb-1 text-xs">Reference: Expected Folder Structure (from Local Agent)</p>
              <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
              <p className="text-xs text-muted-foreground mt-1">This is an example. Your local agent controls the final path based on its settings and your destination selections within it.</p>
            </div>
             <Button variant="outline" size="sm" onClick={handleFetchAvailableDrives} disabled={agentConnectionStatus !== 'connected' || isMonitoring}>
              Fetch Drive Info (Conceptual)
            </Button>
            {availablePaths.length > 0 && (
                <div className="text-xs p-2 border rounded-md bg-muted/30 max-h-24 overflow-y-auto">
                    <p className="font-medium">Agent reported drives (conceptual):</p>
                    <ul className="list-disc list-inside pl-2">
                        {availablePaths.map((drive, index) => <li key={`${drive.path}-${index}`}>{drive.path}</li>)}
                    </ul>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Step 2: Monitor Job from Local Agent</CardTitle>
            <CardDescription>
                After starting the job in your local desktop agent, it will provide a Job ID. Enter that ID here to allow HIVE to monitor its progress.
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
                        disabled={isMonitoring || !selectedPhotographerId || !selectedEventId || agentConnectionStatus !== 'connected'}
                        className="font-mono"
                    />
                </div>
                <Button onClick={startMonitoringJob} disabled={!jobIdToMonitorInput.trim() || isMonitoring || agentConnectionStatus !== 'connected' || !selectedEventId || !selectedPhotographerId}>
                {isMonitoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
                {isMonitoring ? `Monitoring: ${currentJobId ? currentJobId.substring(0,10)+'...' : '...'}` : "Start Monitoring Job"}
                </Button>
            </div>
             {isMonitoring && currentJobId && <p className="text-xs text-muted-foreground mt-1">Currently monitoring Job ID: {currentJobId}</p>}
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
            <p>Files Matched (by Agent, used for HIVE updates): <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span></p>
            <p>Files Unmatched by Agent: <span className="font-semibold">{ingestionSummary.filesUnmatched ?? "N/A"}</span></p>
            <p>Total Size (Agent): <span className="font-semibold">{ingestionSummary.totalSizeMB ?? "N/A"} MB</span></p>
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
            <p className="text-xs text-muted-foreground">This report is based on the latest status from the local agent. HIVE updates its internal shot statuses based on the agent's report for successfully matched/processed files for the selected event.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required for File Operations</AlertTitle>
        <AlertDescription className="text-xs">
          HIVE sets the context (Photographer, Event) and monitors jobs based on a Job ID. You must use your separate **local HIVE desktop agent application** to select actual file paths, start the ingestion, and obtain the Job ID. Enter that Job ID back into this HIVE page to monitor progress and update HIVE shot statuses. The local agent performs all file copying, checksums, and folder creation.
        </AlertDescription>
      </Alert>
    </div>
  );
}
