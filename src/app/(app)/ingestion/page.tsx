
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

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

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  
  const [sourcePath1, setSourcePath1] = useState<string>("");
  const [sourcePath2, setSourcePath2] = useState<string>("");
  const [workingPath, setWorkingPath] = useState<string>("");
  const [backupPath, setBackupPath] = useState<string>("");

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [ingestionSummary, setIngestionSummary] = useState<Partial<IngestJobStatus> | null>(null);
  
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [availableDrives, setAvailableDrives] = useState<DriveInfo[]>([]);

  const isMonitoringRef = useRef(isMonitoring);
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  const logActivity = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'LOG: ';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);
  
  const verifyAgentConnection = useCallback(async (showToast = false) => {
    setAgentConnectionStatus('checking');
    logActivity("Verifying connection to local agent (http://localhost:8765/available-drives)...");
    try {
      await localUtility.getAvailableDrives(); 
      setAgentConnectionStatus('connected');
      logActivity("Successfully connected to local agent.", 'success');
      if (showToast) toast({ title: "Local Agent Connected", description: "HIVE can communicate with the local ingestion agent." });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAgentConnectionStatus('disconnected');
      logActivity(`Failed to connect to local agent: ${errorMessage}`, 'error');
      let toastDescription = `Error: ${errorMessage}`;
      if (errorMessage.toLowerCase().includes("failed to fetch") || errorMessage.toLowerCase().includes("networkerror") || errorMessage.toLowerCase().includes("connection refused")) {
        toastDescription = "Could not reach local agent. Ensure it's running on http://localhost:8765 and CORS is correctly configured.";
      } else if (errorMessage.includes("status: 404")) {
        toastDescription = "Agent connected, but '/available-drives' endpoint not found (404). Check agent API routes.";
      } else if (errorMessage.includes("status:")) {
        toastDescription = `Agent responded with an error: ${errorMessage}. Check agent logs.`;
      }
      if (showToast) toast({ title: "Agent Connection Failed", description: toastDescription, variant: "destructive", duration: 10000 });
      return false;
    }
  }, [logActivity, toast]);

  useEffect(() => {
    verifyAgentConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPhotographerDetails = useMemo(() => {
    return initialPersonnelMock.find(p => p.id === selectedPhotographerId);
  }, [selectedPhotographerId]);

  const selectedEventDetails = useMemo(() => {
    return eventsForSelectedProjectAndOrg.find(e => e.id === selectedEventId);
  }, [selectedEventId, eventsForSelectedProjectAndOrg]);

  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(p => p.role === "Photographer" && p.cameraSerials && p.cameraSerials.length > 0);
  }, []);

  const availableEvents = useMemo(() => {
    return eventsForSelectedProjectAndOrg.filter(e => e.isCovered).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [eventsForSelectedProjectAndOrg]);

  useEffect(() => {
    // Clear job details if context changes and not actively processing
    if (!isSubmittingJob && !isMonitoring) {
      setCurrentJobId(null);
      setIngestionLog([]);
      setIngestionSummary(null);
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [selectedPhotographerId, selectedEventId, sourcePath1, sourcePath2, workingPath, backupPath, isSubmittingJob, isMonitoring, pollingIntervalId]);


  const handleStartIngestion = async () => {
    if (!selectedPhotographerId || !selectedEventId || !sourcePath1.trim() || !workingPath.trim() || !backupPath.trim()) {
      toast({ title: "Missing Information", description: "Photographer, Event, Source Path 1, Working, and Backup paths are required.", variant: "destructive" });
      return;
    }
    if (agentConnectionStatus !== 'connected') {
        const connected = await verifyAgentConnection(true);
        if (!connected) return;
    }

    setIsSubmittingJob(true);
    setIsMonitoring(false); // Reset monitoring state
    if (pollingIntervalId) clearInterval(pollingIntervalId); // Clear previous interval
    setPollingIntervalId(null);
    setCurrentJobId(null);
    setIngestionLog([]);
    setIngestionSummary(null);
    logActivity("Preparing job details for local agent...");

    const photographerForAgent: PhotographerInfoForAgent = {
      id: selectedPhotographerDetails!.id,
      name: selectedPhotographerDetails!.name,
      cameraSerials: selectedPhotographerDetails!.cameraSerials || [],
    };

    const jobData: IngestJobRequest = {
      photographerId: selectedPhotographerId,
      photographerCameraSerial: photographerForAgent.cameraSerials?.[0], // Send first serial as primary
      eventId: selectedEventId,
      sourcePaths: [sourcePath1.trim(), sourcePath2.trim()].filter(Boolean),
      workingPath: workingPath.trim(),
      backupPath: backupPath.trim(),
    };

    logActivity(`Sending job request to local agent for Photographer: ${selectedPhotographerDetails?.name}, Event: ${selectedEventDetails?.name}`);
    logActivity(`Job Details: ${JSON.stringify(jobData, null, 2)}`);

    try {
      const result = await localUtility.startIngest(jobData);
      logActivity(`Local agent responded. Job ID: ${result.jobId}. Message: ${result.message || 'N/A'}. Starting to monitor...`, 'success');
      setCurrentJobId(result.jobId);
      setIsMonitoring(true); 
      toast({ title: "Ingestion Job Initiated", description: `Job ID: ${result.jobId}. Monitoring started.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error starting ingestion job: ${errorMessage}`, 'error');
      toast({ title: "Failed to Start Ingestion", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmittingJob(false);
    }
  };

  useEffect(() => {
    if (currentJobId && isMonitoring) {
      const interval = setInterval(async () => {
        if (!isMonitoringRef.current || !currentJobId) { // Check ref before fetching
          clearInterval(interval);
          return;
        }
        try {
          logActivity(`Polling status for Job ID: ${currentJobId}...`);
          const statusResult = await localUtility.getJobStatus(currentJobId);
          logActivity(`Agent status: ${statusResult.status}. Message: ${statusResult.message || 'N/A'}. Progress: ${statusResult.progress || 0}%`);
          setIngestionSummary(prev => ({...prev, ...statusResult}));

          if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
            logActivity(`Job ${currentJobId} finished with status: ${statusResult.status}. Stopping polling.`, statusResult.status === 'completed' ? 'success' : 'error');
            setIsMonitoring(false);
            clearInterval(interval);
            setPollingIntervalId(null);

            if (statusResult.status === 'completed' && selectedEventDetails && selectedPhotographerDetails) {
              const shotsToUpdateCount = statusResult.filesMatchedToEvents ?? statusResult.filesProcessed ?? 0;
              if (shotsToUpdateCount > 0) {
                logActivity(`Processing HIVE shot updates for completed Job ID: ${currentJobId}, Event: ${selectedEventDetails.name}, Photographer: ${selectedPhotographerDetails.name}. Updating ${shotsToUpdateCount} shots.`);
                const shotsForEvent = getShotRequestsForEvent(selectedEventDetails.id);
                const unassignedOrAssignedShots = shotsForEvent.filter(s => s.status === "Unassigned" || s.status === "Assigned");
                let actualShotsUpdatedInHIVE = 0;

                for (let i = 0; i < Math.min(shotsToUpdateCount, unassignedOrAssignedShots.length); i++) {
                  const shotToUpdate = unassignedOrAssignedShots[i];
                  updateShotRequest(selectedEventDetails.id, shotToUpdate.id, {
                    status: 'Captured',
                    initialCapturerId: selectedPhotographerDetails.id,
                    lastStatusModifierId: selectedPhotographerDetails.id,
                    lastStatusModifiedAt: new Date().toISOString(),
                  });
                  actualShotsUpdatedInHIVE++;
                }
                if (actualShotsUpdatedInHIVE > 0) {
                  logActivity(`HIVE updated ${actualShotsUpdatedInHIVE} shot request(s) to 'Captured' for event ${selectedEventDetails.name}.`, 'success');
                  toast({ title: "HIVE Shot Statuses Updated", description: `${actualShotsUpdatedInHIVE} shot(s) marked 'Captured'.`});
                }
              } else {
                logActivity("No files reported as processed/matched by agent for shot status updates.", "info");
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logActivity(`Error polling job status: ${errorMessage}`, 'error');
          toast({ title: "Polling Error", description: errorMessage, variant: "destructive" });
          // Consider stopping polling on persistent errors
        }
      }, 5000); // Poll every 5 seconds
      setPollingIntervalId(interval);
      return () => {
        clearInterval(interval);
        setPollingIntervalId(null);
      };
    } else if (!isMonitoring && pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJobId, isMonitoring, logActivity, getShotRequestsForEvent, updateShotRequest, selectedEventDetails, selectedPhotographerDetails]);


  const handleFetchAvailableDrives = async () => {
    const connected = await verifyAgentConnection(true);
    if (!connected) return;
    try {
      logActivity("Fetching available drives from local agent...");
      const drives = await localUtility.getAvailableDrives();
      setAvailableDrives(drives.locations);
      logActivity(`Local agent reported drives: ${drives.locations.map(d => d.path).join(', ')}`, 'success');
      toast({ title: "Drives Fetched", description: "Successfully fetched drive list from local agent."});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error fetching drives from local agent: ${errorMessage}`, 'error');
      toast({ title: "Failed to Fetch Drives", description: errorMessage, variant: "destructive" });
      setAvailableDrives([]);
    }
  };

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

  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects;
  
  if (isLoadingContexts) {
    return <div className="p-4">Loading HIVE context...</div>;
  }
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Ingestion Utility
        </h1>
        <AgentStatusIndicator />
      </div>
      
      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Select "Active Photographer" and "Target Event" to set HIVE context for this job.</p>
            <p>2. Enter conceptual local file paths for source and destinations. These paths will be sent to your local desktop agent.</p>
            <p>3. The Local Agent will use this information (and potentially its own UI for path confirmation) to perform file operations.</p>
            <p>4. HIVE will receive a Job ID from the agent and monitor its progress. Completed jobs update HIVE shot statuses.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold">Ingestion Job Setup</p>
          <CardDescription>
            Select context and provide conceptual paths for the local ingestion agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={availablePhotographers.length === 0}>
                <SelectTrigger id="photographer-select">
                  <SelectValue placeholder="Select a photographer..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePhotographers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  {availablePhotographers.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No photographers with camera serials found.</p>}
                </SelectContent>
              </Select>
              {selectedPhotographerDetails && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ScanLine className="h-3.5 w-3.5" /> HIVE Camera S/N(s): {selectedPhotographerDetails.cameraSerials?.join(', ') || "Not specified"}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="event-select">Target Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={!selectedProject || availableEvents.length === 0}>
                <SelectTrigger id="event-select">
                  <SelectValue placeholder={!selectedProject ? "Select a project first" : "Select an event..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({format(new Date(e.date.replace(/-/g, '/')), "MMM d")})</SelectItem>)}
                  {selectedProject && availableEvents.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No covered events for this project.</p>}
                </SelectContent>
              </Select>
            </div>
            <div>
                <Label htmlFor="sourcePath1">Source Path 1 (for Local Agent)</Label>
                <div className="flex items-center gap-2">
                    <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Input id="sourcePath1" value={sourcePath1} onChange={e => setSourcePath1(e.target.value)} placeholder="e.g., /Volumes/CameraCard_01" />
                </div>
            </div>
            <div>
                <Label htmlFor="sourcePath2">Source Path 2 (Optional)</Label>
                 <div className="flex items-center gap-2">
                    <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Input id="sourcePath2" value={sourcePath2} onChange={e => setSourcePath2(e.target.value)} placeholder="e.g., /Volumes/CameraCard_02" />
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
                <Label htmlFor="workingPath">Working Destination Path</Label>
                <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Input id="workingPath" value={workingPath} onChange={e => setWorkingPath(e.target.value)} placeholder="e.g., /Volumes/RAID/ProjectXYZ_Working" />
                </div>
            </div>
            <div>
                <Label htmlFor="backupPath">Backup Destination Path</Label>
                 <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Input id="backupPath" value={backupPath} onChange={e => setBackupPath(e.target.value)} placeholder="e.g., //NAS/ProjectXYZ_Backup" />
                </div>
            </div>
             <p className="text-xs text-muted-foreground pt-2">
                Enter full paths for the local agent. The agent will use these to perform file operations. 
                HIVE will suggest a folder structure like: <code className="text-[10px] p-0.5 bg-muted rounded-sm">[Destination]/[EventDate_YYYYMMDD]/[EventName_Sanitized]/[PhotographerInitials_or_ID]/</code>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <Button onClick={handleStartIngestion} variant="accent" disabled={isSubmittingJob || isMonitoring || !selectedPhotographerId || !selectedEventId || !sourcePath1 || !workingPath || !backupPath || agentConnectionStatus !== 'connected'}>
                {isSubmittingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isSubmittingJob ? "Sending Job..." : (isMonitoring ? "Monitoring..." : "Start Ingestion & Monitor")}
            </Button>
            <Button onClick={handleFetchAvailableDrives} variant="outline" disabled={agentConnectionStatus === 'checking'}>
                <HardDrive className="mr-2 h-4 w-4" /> Fetch Drive Info (Conceptual)
            </Button>
        </CardFooter>
      </Card>

      {currentJobId && (
        <Card>
          <CardHeader>
            <p className="text-lg font-semibold">Monitored Job Context</p>
            <CardDescription>Details for Job ID: {currentJobId}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p><span className="font-medium">Photographer:</span> {selectedPhotographerDetails?.name || "N/A"}</p>
            <p><span className="font-medium">Event:</span> {selectedEventDetails?.name || "N/A"}</p>
          </CardContent>
        </Card>
      )}
      
      {(ingestionLog.length > 0 || isSubmittingJob || isMonitoring) && (
        <Card>
          <CardHeader>
            <p className="text-lg font-semibold">Local Agent Communication Log</p>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={ingestionLog.join('\n')}
              className="h-40 font-mono text-xs bg-muted/30"
              placeholder="Awaiting communication with local agent..."
            />
          </CardContent>
        </Card>
      )}

      {ingestionSummary && (
        <Card>
          <CardHeader>
            <p className="text-lg font-semibold">Ingestion Summary Report</p>
            <CardDescription>Report for Job ID: {ingestionSummary.jobId || currentJobId}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="font-medium">Final Status:</span> <Badge variant={ingestionSummary.status === 'completed' ? 'default' : 'destructive'}>{ingestionSummary.status || "N/A"}</Badge></p>
            <p><span className="font-medium">Message:</span> {ingestionSummary.message || "N/A"}</p>
            <p><span className="font-medium">Files Processed:</span> {ingestionSummary.filesProcessed ?? "N/A"} / {ingestionSummary.totalFiles ?? "N/A"}</p>
            <p><span className="font-medium">Files Matched (for HIVE shots):</span> {ingestionSummary.filesMatchedToEvents ?? "N/A"}</p>
            <p><span className="font-medium">Files Unmatched:</span> {ingestionSummary.filesUnmatched ?? "N/A"}</p>
            <p><span className="font-medium">Total Size:</span> {ingestionSummary.totalSizeMB?.toFixed(1) ?? "N/A"} MB</p>
            <p><span className="font-medium">Checksum Result:</span> {ingestionSummary.checksumResult || "N/A"}</p>
            {ingestionSummary.errors && ingestionSummary.errors.length > 0 && (
              <div>
                <span className="font-medium">Errors:</span>
                <ul className="list-disc list-inside pl-4 text-destructive text-xs">
                  {ingestionSummary.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            {ingestionSummary.reportUrl && (
                 <p><span className="font-medium">Detailed Report:</span> <Button variant="link" asChild className="p-0 h-auto text-sm"><a href={ingestionSummary.reportUrl} target="_blank" rel="noopener noreferrer">View Agent Report</a></Button></p>
            )}
          </CardContent>
        </Card>
      )}
      
      {availableDrives.length > 0 && (
        <Card className="bg-muted/30 p-3 mt-2">
             <CardContent className="pt-3 text-xs">
                <p className="font-medium">Agent reported drives (conceptual):</p>
                <ul className="list-disc list-inside pl-2">
                    {availableDrives.map((drive, index) => <li key={`${drive.path}-${index}`}>{drive.path}</li>)}
                </ul>
            </CardContent>
        </Card>
      )}

       <Alert variant="destructive" className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page initiates and monitors ingestion jobs. The actual file selection (based on paths you provide here), copying, EXIF parsing, and folder creation are performed by a **separate local desktop agent application** running on your computer (e.g., at http://localhost:8765). HIVE sends job parameters to this agent. Ensure your local agent is running, authenticated (if required by agent), and configured to communicate with HIVE's API for status updates.
        </AlertDescription>
      </Alert>
    </div>
  );
}
