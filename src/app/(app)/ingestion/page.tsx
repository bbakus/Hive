
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
import { useEventContext, type Event, type ShotRequestFormData } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';
interface DriveInfo {
  path: string;
  [key: string]: any; // To accommodate other potential properties like available, freeSpace etc.
}

// New interface based on local utility specifications
interface PhotographerInfo {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[]; // Array of serials
    preferredRawFormat?: string; // Assuming RawFormat is a string type for now
    notes?: string;
}

export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, getShotRequestsForEvent, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [sourcePath1, setSourcePath1] = useState<string>("");
  const [sourcePath2, setSourcePath2] = useState<string>("");
  const [workingPath, setWorkingPath] = useState<string>("");
  const [backupPath, setBackupPath] = useState<string>("");

  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [ingestionSummary, setIngestionSummary] = useState<{
    filesProcessed: number;
    totalSizeMB: number;
    shotsUpdated: number;
    checksumStatus: string;
    finalMessage?: string;
    errors?: string[];
  } | null>(null);

  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [availableDrives, setAvailableDrives] = useState<DriveInfo[]>([]);


  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(
      p => PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role === "Photographer" && p.cameraSerial // Keep filtering by single cameraSerial for dropdown simplicity
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
    // Cleanup polling interval on component unmount
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  const handleStartIngestion = async () => {
    if (!await verifyAgentConnection()) {
      toast({ title: 'Agent Not Connected', description: 'Cannot initiate. Please ensure the local agent is running and accessible.', variant: 'destructive'});
      return;
    }

    if (!selectedPhotographerId || !selectedEventId || !sourcePath1.trim() || !workingPath.trim() || !backupPath.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select photographer, event, and provide all required paths.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsIngesting(true);
    setIngestionLog([]);
    setIngestionSummary(null);
    setCurrentJobId(null); 

    const photographerForAgent: PhotographerInfo | undefined = selectedPhotographerDetails ? {
        id: selectedPhotographerDetails.id,
        name: selectedPhotographerDetails.name,
        // email: selectedPhotographerDetails.email, // Assuming Personnel type has email
        cameraSerials: selectedPhotographerDetails.cameraSerial ? [selectedPhotographerDetails.cameraSerial] : [],
        // preferredRawFormat: selectedPhotographerDetails.preferredRawFormat, // Assuming Personnel type has this
        // notes: selectedPhotographerDetails.notes // Assuming Personnel type has this
    } : undefined;

    if (!photographerForAgent) {
        logMessage("Selected photographer details not found. Cannot start ingestion.", "error");
        toast({ title: "Photographer Error", description: "Could not retrieve details for the selected photographer.", variant: "destructive" });
        setIsIngesting(false);
        return;
    }
    
    const jobData = {
      photographer: photographerForAgent,
      photographerCameraSerial: photographerForAgent.cameraSerials?.[0] || undefined, // Send the first serial if available
      eventId: selectedEventId,
      sourcePaths: [sourcePath1.trim(), sourcePath2.trim()].filter(p => p),
      workingPath: workingPath.trim(),
      backupPath: backupPath.trim(),
    };

    logMessage(`Sending job request to local agent for Photographer: ${photographerForAgent.name}, Event: ${selectedEventDetails?.name}.`);
    logMessage(`Job Details: ${JSON.stringify(jobData, null, 2)}`);
    logMessage("The local agent should now prompt for path confirmation and start file operations.");


    try {
      const result = await localUtility.startIngest(jobData);
      const newJobId = result.jobId;
      if (!newJobId) {
        throw new Error("Local agent did not return a Job ID.");
      }
      setCurrentJobId(newJobId);
      logMessage(`Local agent confirmed job start. Job ID: ${newJobId}. ${result.message || ''}`);
      logMessage(`Starting to monitor Job ID: ${newJobId}`);
      
      const interval = setInterval(async () => {
        if (!newJobId) { 
              clearInterval(interval);
              setPollingIntervalId(null);
              return;
            }
        try {
          const statusResult: IngestJobStatus = await localUtility.getJobStatus(newJobId);
          logMessage(`Agent reported status (${newJobId}): ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress || 0}%)`);

          if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
            clearInterval(interval);
            setPollingIntervalId(null);
            setIsIngesting(false);
            logMessage(`Ingestion job ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');

            setIngestionSummary({
              filesProcessed: statusResult.filesProcessed || 0,
              totalSizeMB: statusResult.totalSizeMB || 0,
              shotsUpdated: 0, 
              checksumStatus: statusResult.checksumResult || "N/A",
              finalMessage: statusResult.message,
              errors: statusResult.errors
            });

            if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
              toast({ title: 'Ingestion Complete (Agent)', description: statusResult.message || 'Files processed by local agent. Updating HIVE...' });

              let shotsUpdatedCount = 0;
              const shotsForEvent = getShotRequestsForEvent(selectedEventId);
              const updatableShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
              
              const filesToConsiderForShotUpdate = statusResult.filesProcessed || 0; // Use filesProcessed from agent
              const shotsToUpdateCount = Math.min(updatableShots.length, filesToConsiderForShotUpdate);

              if (shotsToUpdateCount > 0) {
                logMessage(`Updating ${shotsToUpdateCount} shot requests in HIVE for event "${selectedEventDetails?.name}"...`);
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
                setIngestionSummary(prev => prev ? {...prev, shotsUpdated: shotsUpdatedCount} : null);
                if (shotsUpdatedCount > 0) {
                  toast({ title: "HIVE Updated", description: `${shotsUpdatedCount} shot requests marked as 'Captured'.`});
                }
              } else {
                logMessage(`No updatable shots found in HIVE for event "${selectedEventDetails?.name}" or no files reported processed by agent.`);
              }
            } else if (statusResult.status === 'failed' || statusResult.status === 'cancelled') {
              toast({ title: `Ingestion ${statusResult.status}`, description: statusResult.message || `Local agent reported ${statusResult.status}.`, variant: 'destructive' });
            }
          }
        } catch (statusError: any) {
          logMessage(`Error polling job status for ${newJobId}: ${statusError.message || String(statusError)}`, 'error');
          if(pollingIntervalId) clearInterval(pollingIntervalId); // ensure interval is cleared from the outer scope
          setPollingIntervalId(null);
          setIsIngesting(false);
          setCurrentJobId(null); // Reset currentJobId as polling failed
          toast({ title: 'Polling Error', description: `Could not get status for job ${newJobId}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
        }
      }, 5000); // Poll every 5 seconds
      setPollingIntervalId(interval);

    } catch (error: any) {
      logMessage(`Error starting ingestion job: ${error.message || String(error)}`, 'error');
      toast({ title: 'Ingestion Start Failed', description: `Could not start job with local agent. ${error.message || String(error)}`, variant: 'destructive' });
      setIsIngesting(false);
    }
  };
  
  const handleFetchAvailableDrives = async () => {
    if (!await verifyAgentConnection()) return;
    logMessage("Fetching available drives from local agent...");
    try {
      const drives = await localUtility.getAvailableDrives();
      if (drives && drives.locations) {
        // Ensure locations are treated as DriveInfo[]
        setAvailableDrives(drives.locations.map(loc => typeof loc === 'string' ? { path: loc } : loc));
        logMessage(`Available drives/locations received: ${drives.locations.map(l => (typeof l === 'string' ? l : l.path)).join(', ')}`, "success");
        toast({ title: "Drives Fetched", description: "Drive information received from local agent." });
      } else {
        logMessage("No drive locations returned by agent.", "info");
        setAvailableDrives([]);
      }
    } catch (error: any) {
      logMessage(`Error fetching available drives: ${error.message || String(error)}`, "error");
      toast({ title: "Fetch Drives Failed", description: error.message || "Could not get drive info.", variant: "destructive" });
      setAvailableDrives([]);
    }
  };

  useEffect(() => {
    // Clear job monitoring if photographer or event changes
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setCurrentJobId(null); // Also clear job ID as it's no longer relevant
      setIsIngesting(false); // Stop ingesting state
      logMessage("Photographer or Event selection changed. Monitoring stopped if active.", "info");
    }
  }, [selectedPhotographerId, selectedEventId, pollingIntervalId, logMessage]); // Added pollingIntervalId and logMessage to dependencies


  const expectedFolderPath = useMemo(() => {
    if (!selectedEventDetails || !selectedPhotographerDetails) return "[Select Event & Photographer]";
    const eventDate = selectedEventDetails.date ? format(new Date(selectedEventDetails.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventName = selectedEventDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const photographerInitials = selectedPhotographerDetails.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'PHOTOG';
    return `[Your_Root_Destination_Path]/HIVE_Ingest/${eventName}_${eventDate}/${photographerInitials}/`;
  }, [selectedEventDetails, selectedPhotographerDetails]);

  if (isLoadingSettings || isLoadingEvents) {
    return <div>Loading ingestion utility settings...</div>;
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
            Please select a project from the main header to use the Ingestion Utility. This helps contextualize events and personnel.
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
          HIVE provides context to your local desktop agent, which handles path selection & file operations. HIVE then monitors progress.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Job Setup</CardTitle>
          <CardDescription>
            Select Photographer and Event context in HIVE. Your local desktop agent will prompt for actual file paths and start the job. HIVE will then receive a Job ID from the agent to monitor progress and update shot statuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer (for HIVE Record)</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={isIngesting}>
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
              <Label htmlFor="event-select">Target Event (for HIVE Record)</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isIngesting || !selectedProject || relevantEvents.length === 0}>
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
            <div className="space-y-2">
              <Label htmlFor="sourcePath1">Source Path 1 (Conceptual - for Local Agent)</Label>
              <div className="flex items-center gap-2">
                  <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <Input 
                      id="sourcePath1" 
                      value={sourcePath1} 
                      onChange={(e) => setSourcePath1(e.target.value)} 
                      placeholder="e.g., /Volumes/CameraCard1 or C:\\Users\\User\\DCIM" 
                      disabled={isIngesting}
                  />
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="sourcePath2">Source Path 2 (Optional, Conceptual)</Label>
               <div className="flex items-center gap-2">
                  <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <Input 
                      id="sourcePath2" 
                      value={sourcePath2} 
                      onChange={(e) => setSourcePath2(e.target.value)} 
                      placeholder="e.g., /Volumes/CameraCard2" 
                      disabled={isIngesting}
                  />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workingPath">Working Destination Path (Conceptual)</Label>
               <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <Input 
                      id="workingPath" 
                      value={workingPath} 
                      onChange={(e) => setWorkingPath(e.target.value)} 
                      placeholder="e.g., /Volumes/RAID/ProjectXYZ/Working" 
                      disabled={isIngesting}
                  />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backupPath">Backup Destination Path (Conceptual)</Label>
              <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <Input 
                      id="backupPath" 
                      value={backupPath} 
                      onChange={(e) => setBackupPath(e.target.value)} 
                      placeholder="e.g., //NAS/Backups/ProjectXYZ" 
                      disabled={isIngesting}
                  />
              </div>
            </div>
            <Button onClick={handleStartIngestion} disabled={!selectedPhotographerId || !selectedEventId || !sourcePath1.trim() || !workingPath.trim() || !backupPath.trim() || isIngesting || agentConnectionStatus !== 'connected'}>
                {isIngesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isIngesting ? `Ingesting (Job: ${currentJobId ? currentJobId.substring(0,8)+'...' : 'Starting...'})` : "Start Ingestion Job"}
            </Button>
            {agentConnectionStatus !== 'connected' && (
              <p className="text-sm text-destructive">Local agent not connected. Cannot start ingestion.</p>
            )}
             <div className="mt-4 text-sm p-3 border rounded-md bg-muted/30">
              <p className="font-medium text-foreground mb-1">Expected Folder Structure (Example for Local Agent):</p>
              <p className="text-xs text-muted-foreground font-mono">{expectedFolderPath}</p>
              <p className="text-xs text-muted-foreground mt-1">Your local agent should be configured to create a similar structure within the chosen working/backup destinations.</p>
            </div>
             <Button variant="outline" size="sm" onClick={handleFetchAvailableDrives} disabled={isIngesting || agentConnectionStatus !== 'connected'}>
              Fetch Drive Info (for Agent Connection Test)
            </Button>
            {availableDrives.length > 0 && (
                <div className="mt-2 text-xs p-2 border rounded-md bg-muted/30">
                    <p className="font-medium">Agent reported drives (conceptual):</p>
                    <ul className="list-disc list-inside pl-2">
                        {availableDrives.map((drive, index) => <li key={`${drive.path}-${index}`}>{drive.path}</li>)}
                    </ul>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(ingestionLog.length > 0 || isIngesting) && (
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
             {currentJobId && <CardDescription>Job ID: {currentJobId}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed}</span>
            </p>
            <p className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Total Size Processed by Agent: <span className="font-semibold">{ingestionSummary.totalSizeMB} MB</span>
            </p>
            <p className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Shot Requests Updated in HIVE: <span className="font-semibold">{ingestionSummary.shotsUpdated}</span>
            </p>
            <p className="flex items-center gap-2">
              {ingestionSummary.checksumStatus?.toLowerCase().includes('pass') || ingestionSummary.checksumStatus?.toLowerCase().includes('verified') ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Agent Checksum Status: <span className="font-semibold">{ingestionSummary.checksumStatus}</span>
            </p>
            {ingestionSummary.finalMessage && (
                <p className="text-xs text-muted-foreground">Agent Message: {ingestionSummary.finalMessage}</p>
            )}
            {ingestionSummary.errors && ingestionSummary.errors.length > 0 && (
                <div>
                    <p className="font-semibold text-destructive">Agent Errors:</p>
                    <ul className="list-disc list-inside text-destructive text-xs">
                        {ingestionSummary.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This report is based on responses from the local agent. HIVE updates its internal shot statuses upon successful completion reported by the agent.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required for File Operations</AlertTitle>
        <AlertDescription>
          This HIVE utility page sends contextual information (Photographer, Event, conceptual paths) to a separate **local HIVE desktop agent application** running on your computer. The local agent is responsible for prompting you for actual file/folder paths via its own UI, performing all file copying, checksums, and folder creation. HIVE then receives a Job ID from the agent to monitor progress and updates its internal shot statuses based on the agent's reports. Ensure your local agent is running, configured to communicate with HIVE, and is prepared to handle the job data described.
        </AlertDescription>
      </Alert>
    </div>
  );
}


    