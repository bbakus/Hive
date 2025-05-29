
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, FolderInput, HardDrive, HelpCircle } from 'lucide-react'; // Added HelpCircle
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

interface DriveInfo {
  path: string;
  [key: string]: any;
}

// This interface matches what HIVE sends to the local agent
// and what the local agent might internally use for context.
interface PhotographerInfoForAgent {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    notes?: string;
}


export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null); // This will hold the Job ID from the local agent
  const [jobIdToMonitorInput, setJobIdToMonitorInput] = useState<string>("");


  const [ingestionSummary, setIngestionSummary] = useState<IngestJobStatus | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);


  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(
      p => p.role === "Photographer" && p.cameraSerial // Ensure they have a camera serial
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Clear job ID and polling if inputs change
  useEffect(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    setCurrentJobId(null);
    setIngestionSummary(null);
    setJobIdToMonitorInput("");
    // Only reset log if it's not just a connection check
    // setIngestionLog(prev => prev.length > 1 ? ["INFO: Selections changed, ready for new job monitoring."] : prev); 
  }, [selectedEventId, selectedPhotographerId, pollingIntervalId]);


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

    // Clear previous job monitoring states
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    setPollingIntervalId(null);
    setCurrentJobId(null);
    setJobIdToMonitorInput("");
    setIngestionSummary(null);
    setIngestionLog([]);

    logMessage(`HIVE Context Set for Local Agent:`);
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
    const jobId = jobIdToMonitorInput.trim();
    if (!jobId) {
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

    if (pollingIntervalId) clearInterval(pollingIntervalId); // Clear any existing polling

    setCurrentJobId(jobId);
    setIngestionSummary(null); 
    logMessage(`HIVE monitoring Job ID: ${jobId}. Polling local agent for status updates.`);

    const interval = setInterval(async () => {
      // Check against state variable `currentJobId` in case it gets cleared by other effects
      if (!currentJobId || currentJobId !== jobId) { 
        clearInterval(interval);
        setPollingIntervalId(null);
        return;
      }
      try {
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(jobId);
        logMessage(`Agent reported status for Job ${jobId}: ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress !== undefined ? statusResult.progress : 'N/A'}%)`);
        setIngestionSummary(statusResult);

        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          clearInterval(interval);
          setPollingIntervalId(null);
          logMessage(`Ingestion job ${jobId} ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
          
          if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
            // Use filesMatchedToEvents if available, otherwise filesProcessed, or default to 0.
            const shotsToUpdateInHIVE = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
            
            if (shotsToUpdateInHIVE > 0) {
                logMessage(`Updating up to ${shotsToUpdateInHIVE} shot requests in HIVE for event "${selectedEventDetails?.name}"...`);
                const allShotsForEvent: ShotRequest[] = (eventsForSelectedProjectAndOrg.find(e=>e.id === selectedEventId)?.shotRequestsData || []);
                const updatableShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                
                let shotsUpdatedCount = 0;
                for (let i = 0; i < Math.min(updatableShots.length, shotsToUpdateInHIVE); i++) {
                    const shot = updatableShots[i];
                    updateShotRequest(selectedEventId, shot.id, {
                      status: 'Captured',
                      initialCapturerId: selectedPhotographerId,
                      lastStatusModifierId: selectedPhotographerId,
                      lastStatusModifiedAt: new Date().toISOString(),
                    });
                    logMessage(`HIVE status updated for shot: "${shot.description.substring(0,30)}..." to Captured.`);
                    shotsUpdatedCount++;
                }
                // Update summary with actual count of shots updated in HIVE
                setIngestionSummary(prev => prev ? {...prev, filesMatchedToEvents: shotsUpdatedCount} : { jobId: jobId, status: 'completed', filesMatchedToEvents: shotsUpdatedCount, filesProcessed: shotsToUpdateInHIVE });
                if (shotsUpdatedCount > 0) {
                    toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCount} shot requests for event "${selectedEventDetails?.name}" marked as 'Captured' based on agent report.`});
                } else {
                    logMessage("No uncaptured shot requests were available in HIVE to update for this event, or agent reported 0 files processed/matched.");
                }
            } else {
                 logMessage("Agent reported 0 files processed/matched, or no value provided. No HIVE shot statuses updated.");
            }
          }
        }
      } catch (statusError: any) {
        logMessage(`Error getting job status for ${jobId} from local agent: ${statusError.message || String(statusError)}`, 'error');
        clearInterval(interval);
        setPollingIntervalId(null);
        setCurrentJobId(null); // Stop trying to monitor a potentially dead job
        toast({ title: 'Polling Error', description: `Could not get status for job ${jobId} from local agent. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 5000);
    setPollingIntervalId(interval);
  };
  
  const expectedFolderPath = useMemo(() => {
    if (!selectedEventDetails || !selectedPhotographerDetails || !selectedProject) return "[Select Project, Event & Photographer in HIVE for reference]";
    const eventDate = selectedEventDetails.date ? format(new Date(selectedEventDetails.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventNameSanitized = selectedEventDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    
    let photographerNameSanitized = "PHOTOG";
    if (selectedPhotographerDetails) {
        const nameParts = selectedPhotographerDetails.name.split(" ");
        const initials = nameParts.map(part => part[0]).join("").toUpperCase();
        photographerNameSanitized = initials || selectedPhotographerDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,10);
    }

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
          <UploadCloud className="h-8 w-8 text-accent" /> Ingestion Utility
        </h1>
        <AgentStatusIndicator />
      </div>
       <p className="text-muted-foreground -mt-6">
          Set HIVE context, then use your local desktop agent to start an ingestion job. Enter the Job ID from the agent below to monitor progress and update HIVE.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Step 1: Set HIVE Context for Local Agent</CardTitle>
          <CardDescription>
            Select the Photographer and Event. HIVE will display this context. Then, use your local desktop agent to select paths and start the job.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer (HIVE Context)</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} >
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
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={!selectedProject || relevantEvents.length === 0}>
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
            <Button onClick={handleSignalAgent} disabled={!selectedPhotographerId || !selectedEventId || agentConnectionStatus !== 'connected'}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Confirm Context & Prepare for Job ID
            </Button>
            {agentConnectionStatus !== 'connected' && (
              <p className="text-sm text-destructive">Local agent not connected. HIVE cannot monitor jobs.</p>
            )}
          </div>

          <div className="space-y-4">
             <div className="mt-1 text-sm p-3 border rounded-md bg-muted/30">
              <p className="font-medium text-foreground mb-1 text-xs">Reference: Expected Folder Structure (Local Agent)</p>
              <p className="text-xs text-muted-foreground font-mono break-all">{expectedFolderPath}</p>
              <p className="text-xs text-muted-foreground mt-1">Your local agent should create this structure. Path selection and job start occur in the local agent's UI.</p>
            </div>
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
                        disabled={agentConnectionStatus !== 'connected' || !selectedPhotographerId || !selectedEventId || !!currentJobId}
                        className="font-mono"
                    />
                </div>
                <Button onClick={startMonitoringJob} disabled={!jobIdToMonitorInput.trim() || !!currentJobId || agentConnectionStatus !== 'connected' || !selectedEventId || !selectedPhotographerId}>
                 <Info className="mr-2 h-4 w-4" />
                 Start Monitoring Job
                </Button>
            </div>
             {currentJobId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span>Currently monitoring Job ID: <span className="font-semibold text-foreground">{currentJobId}</span>. Waiting for agent updates...</span>
                </div>
            )}
        </CardContent>
      </Card>


      {(ingestionLog.length > 0) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log</CardTitle>
            {currentJobId && <CardDescription>Monitoring Job ID: <span className="font-mono">{currentJobId}</span></CardDescription>}
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
            <p>Overall Status: <span className="font-semibold">{ingestionSummary.status}</span></p>
            <p>Agent Message: <span className="italic text-muted-foreground">{ingestionSummary.message || "N/A"}</span></p>
            <p>Total Files Detected by Agent: <span className="font-semibold">{ingestionSummary.totalFiles ?? "N/A"}</span></p>
            <p>Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed ?? "N/A"}</span></p>
            <p>Files Agent Matched to Event: <span className="font-semibold">{ingestionSummary.filesMatchedToEvents ?? "N/A"}</span></p>
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
            <p className="text-xs text-muted-foreground pt-2">HIVE Shot Requests Updated: {ingestionSummary.status === 'completed' ? (ingestionSummary.filesMatchedToEvents ?? ingestionSummary.filesProcessed ?? 0) : "0 (pending agent completion)"} (based on agent report for selected event)</p>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This report is based on the latest status from the local agent. HIVE updates its internal shot statuses based on the agent's report for files matched to the selected event.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required for File Operations</AlertTitle>
        <AlertDescription className="text-xs">
          HIVE sets the context (Photographer, Event) and monitors jobs based on a Job ID provided by your local agent. You must use your separate **local HIVE desktop agent application** to select actual file paths, start the ingestion, and obtain the Job ID. Enter that Job ID back into this HIVE page to monitor progress and update HIVE shot statuses. The local agent performs all file copying, checksums, and folder creation.
        </AlertDescription>
      </Alert>
    </div>
  );
}
