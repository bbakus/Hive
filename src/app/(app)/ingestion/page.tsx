
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, List, HelpCircle, Power, PowerOff, FolderInput, HardDrive, Link as LinkIcon, ListChecks } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo, type IngestJobRequest } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

export default function IngestionUtilityPage() {
  const { selectedProjectId, selectedProject, isLoadingProjects } = useProjectContext();
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
  const [availableDrives, setAvailableDrives] = useState<DriveInfo[]>([]); // For conceptual display

  const isMonitoringRef = useRef(isMonitoring);
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  const getPersonnelName = useCallback((id?: string) => {
    if (!id) return "N/A";
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : id;
  }, []);

  const getEventName = useCallback((id?: string) => {
    if (!id) return "N/A";
    const event = getEventById(id);
    return event ? event.name : id;
  }, [getEventById]);

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
          description: "HIVE can communicate with the local ingestion agent.",
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

  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(p => PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role === "Photographer" && p.cameraSerials && p.cameraSerials.length > 0);
  }, []);

  const selectedPhotographerDetails = useMemo(() => {
    return initialPersonnelMock.find(p => p.id === selectedPhotographerId);
  }, [selectedPhotographerId]);

  const availableEvents = useMemo(() => {
    if (!selectedProject) return [];
    return eventsForSelectedProjectAndOrg.filter(event => event.isCovered);
  }, [selectedProject, eventsForSelectedProjectAndOrg]);

  const selectedEventDetails = useMemo(() => {
    return availableEvents.find(e => e.id === selectedEventId);
  }, [selectedEventId, availableEvents]);


  const handleStartIngestion = async () => {
    if (!selectedPhotographerId || !selectedEventId || !sourcePath1 || !workingPath || !backupPath) {
      toast({ title: "Missing Information", description: "Please select Photographer, Event, and specify all required paths.", variant: "destructive" });
      return;
    }
    if (agentConnectionStatus !== 'connected') {
        const connected = await verifyAgentConnection(true);
        if (!connected) {
            toast({ title: "Agent Not Connected", description: "Cannot start ingestion. Please ensure the local agent is running and connected.", variant: "destructive" });
            return;
        }
    }

    setIsSubmittingJob(true);
    setIsMonitoring(false);
    setCurrentJobId(null);
    setIngestionLog([`${new Date().toLocaleTimeString()}: INFO: Preparing job request...`]);
    setIngestionSummary(null);

    const jobData: IngestJobRequest = {
      photographerId: selectedPhotographerId,
      eventId: selectedEventId,
      sourcePaths: [sourcePath1.trim(), sourcePath2.trim()].filter(Boolean), // Only include non-empty paths
      workingPath: workingPath.trim(),
      backupPath: backupPath.trim(),
    };

    logMessage(`Sending job request to local agent: ${JSON.stringify(jobData)}`);

    try {
      const result = await localUtility.startIngest(jobData);
      logMessage(`Local agent responded. Job ID: ${result.jobId}. Message: ${result.message || 'N/A'}`, 'success');
      setCurrentJobId(result.jobId);
      setIsMonitoring(true); // Start polling
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error starting ingestion job: ${errorMessage}`, 'error');
      toast({ title: "Failed to Start Ingestion", description: errorMessage, variant: "destructive" });
      setCurrentJobId(null);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  useEffect(() => {
    if (isMonitoring && currentJobId && !pollingIntervalId) {
      logMessage(`Started monitoring Job ID: ${currentJobId}. Polling status every 5 seconds.`);
      const intervalId = setInterval(async () => {
        if (isMonitoringRef.current && currentJobId) { // Check ref here
          try {
            logMessage(`Polling status for Job ID: ${currentJobId}...`);
            const statusResult = await localUtility.getJobStatus(currentJobId);
            logMessage(`Agent status for ${currentJobId}: ${statusResult.status}, Message: ${statusResult.message || 'N/A'}, Progress: ${statusResult.progress || 0}%`);
            setIngestionSummary(prev => ({...prev, ...statusResult}));

            if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
              logMessage(`Job ID: ${currentJobId} finished with status: ${statusResult.status}. Stopping polling.`, statusResult.status === 'completed' ? 'success' : 'error');
              setIsMonitoring(false); // This will trigger the cleanup in the next effect cycle
              setIngestionSummary(statusResult);

              if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
                const shotsToUpdateCount = statusResult.filesMatchedToEvents || statusResult.filesProcessed || 0;
                if (shotsToUpdateCount > 0) {
                  logMessage(`Processing HIVE shot updates for Event: ${getEventName(selectedEventId)}, Photographer: ${getPersonnelName(selectedPhotographerId)} based on ${shotsToUpdateCount} processed files.`);
                  const shotsForEvent = getShotRequestsForEvent(selectedEventId);
                  const unassignedOrAssignedShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                  let actualShotsUpdatedCount = 0;
                  for (let i = 0; i < Math.min(unassignedOrAssignedShots.length, shotsToUpdateCount); i++) {
                    const shot = unassignedOrAssignedShots[i];
                    updateShotRequest(selectedEventId, shot.id, {
                      status: 'Captured',
                      initialCapturerId: selectedPhotographerId,
                      lastStatusModifierId: selectedPhotographerId,
                      lastStatusModifiedAt: new Date().toISOString(),
                    });
                    actualShotsUpdatedCount++;
                  }
                  logMessage(`HIVE updated ${actualShotsUpdatedCount} shot request(s) to 'Captured' for event ${getEventName(selectedEventId)}.`);
                  if (actualShotsUpdatedCount > 0) {
                    toast({ title: "HIVE Shots Updated", description: `${actualShotsUpdatedCount} shots marked as 'Captured' for event ${getEventName(selectedEventId)}.`});
                  }
                }
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logMessage(`Error polling job status for ${currentJobId}: ${errorMessage}. Stopping polling.`, 'error');
            toast({ title: "Polling Error", description: `Failed to get status for Job ID ${currentJobId}. ${errorMessage}`, variant: "destructive" });
            setIsMonitoring(false);
          }
        }
      }, 5000);
      setPollingIntervalId(intervalId);
    } else if (!isMonitoring && pollingIntervalId) {
      logMessage(`Stopped monitoring Job ID: ${currentJobId}.`);
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    return () => { // Cleanup function
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
    };
  }, [isMonitoring, currentJobId, pollingIntervalId, logMessage, toast, selectedEventId, selectedPhotographerId, getEventName, getPersonnelName, getShotRequestsForEvent, updateShotRequest]);

  // Clear job details if selections change, encouraging a new job submission
  useEffect(() => {
    if (!isSubmittingJob && !isMonitoring) { // Only reset if not actively submitting or monitoring
        setCurrentJobId(null);
        setIngestionLog([]);
        setIngestionSummary(null);
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            setPollingIntervalId(null);
        }
    }
  }, [selectedPhotographerId, selectedEventId, sourcePath1, sourcePath2, workingPath, backupPath]);


  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects;

  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle;
    let textColor = "text-muted-foreground";
    let statusText = "Unknown";

    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = Power;
        textColor = "text-green-600 dark:text-green-400";
        statusText = "Connected";
        break;
      case 'disconnected':
        IconComponent = PowerOff;
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

  if (isLoadingContexts) {
    return <div className="p-4">Loading HIVE context...</div>;
  }
  if (!useDemoData && !isLoadingSettings) {
     return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Data Disabled</AlertTitle>
        <AlertDescription>
          The Ingestion Utility relies on demo data for context (events, personnel). Enable "Load Demo Data" in Settings for full UI demonstration.
        </AlertDescription>
      </Alert>
    );
  }

  const expectedFolderPath = useMemo(() => {
    if (!selectedEventDetails || !selectedPhotographerDetails) return "[Select Event & Photographer]";
    const eventDate = selectedEventDetails.date ? format(parseISO(selectedEventDetails.date), 'yyyyMMdd') : 'EVENT_DATE';
    const eventName = selectedEventDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const photographerName = selectedPhotographerDetails.name.replace(/\s+/g, '_');
    return `[Working_Or_Backup_Root]/${selectedProject?.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'PROJECT_NAME'}/CAPTURE/${eventDate}/${eventDate}_${eventName}/${photographerName}/`;
  }, [selectedEventDetails, selectedPhotographerDetails, selectedProject]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Swift Ingestion Utility
        </h1>
        <AgentStatusIndicator />
      </div>

      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Select "Active Photographer" and "Target Event" to set HIVE context for this job.</p>
            <p>2. Enter the absolute local paths for "Source", "Working", and "Backup" locations.</p>
            <p>3. Click "Start Ingestion & Monitor". This sends job details to your local desktop agent.</p>
            <p>4. The local agent handles file selection (within its own UI, confirming paths), processing, and returns a Job ID to HIVE.</p>
            <p>5. HIVE monitors the job status and updates shot requests upon completion.</p>
        </AlertDescription>
      </Alert>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Job Setup</CardTitle>
          <CardDescription>Configure and initiate a new ingestion job via the local agent.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={isSubmittingJob || isMonitoring}>
                <SelectTrigger id="photographer-select">
                  <SelectValue placeholder="Select photographer..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePhotographers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  {availablePhotographers.length === 0 && <p className="p-2 text-xs text-muted-foreground">No photographers with camera serials found.</p>}
                </SelectContent>
              </Select>
              {selectedPhotographerDetails && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ScanLine className="h-3.5 w-3.5"/> HIVE Camera S/Ns: {selectedPhotographerDetails.cameraSerials?.join(', ') || "Not specified"}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="event-select">Target Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isSubmittingJob || isMonitoring || !selectedProject}>
                <SelectTrigger id="event-select">
                  <SelectValue placeholder={!selectedProject ? "Select a project first" : "Select event..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({format(parseISO(e.date), "MMM d")})</SelectItem>)}
                  {selectedProject && availableEvents.length === 0 && <p className="p-2 text-xs text-muted-foreground">No covered events for selected project.</p>}
                </SelectContent>
              </Select>
               {selectedEventDetails && (
                 <p className="text-xs text-muted-foreground mt-1">Event Time: {selectedEventDetails.time}</p>
               )}
            </div>
             <div className="space-y-1">
                <Label htmlFor="source-path1">Source Path 1 (for Local Agent)</Label>
                <div className="flex items-center gap-2">
                   <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                   <Input id="source-path1" value={sourcePath1} onChange={e => setSourcePath1(e.target.value)} placeholder="e.g., /Volumes/CameraCard_1" disabled={isSubmittingJob || isMonitoring} />
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="source-path2">Source Path 2 (Optional, for Local Agent)</Label>
                 <div className="flex items-center gap-2">
                   <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                   <Input id="source-path2" value={sourcePath2} onChange={e => setSourcePath2(e.target.value)} placeholder="e.g., /Volumes/CameraCard_2" disabled={isSubmittingJob || isMonitoring} />
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="working-path">Working Destination Path (for Local Agent)</Label>
                <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                    <Input id="working-path" value={workingPath} onChange={e => setWorkingPath(e.target.value)} placeholder="e.g., /Volumes/RAID/ProjectXYZ/Working" disabled={isSubmittingJob || isMonitoring} />
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="backup-path">Backup Destination Path (for Local Agent)</Label>
                 <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                    <Input id="backup-path" value={backupPath} onChange={e => setBackupPath(e.target.value)} placeholder="e.g., //NAS/Backups/ProjectXYZ" disabled={isSubmittingJob || isMonitoring} />
                </div>
            </div>
            <Card className="bg-muted/30 p-3 mt-2">
              <CardDescription className="text-xs space-y-1">
                <p className="font-medium">Expected Folder Structure (Example):</p>
                <code className="block bg-background/50 p-1.5 rounded text-[11px] break-all">{expectedFolderPath}</code>
                <p>The local agent will use this pattern based on selections.</p>
              </CardDescription>
            </Card>
          </div>
        </CardContent>
        <CardFooter>
            <Button
                onClick={handleStartIngestion}
                disabled={isSubmittingJob || isMonitoring || !selectedPhotographerId || !selectedEventId || !sourcePath1 || !workingPath || !backupPath || agentConnectionStatus !== 'connected'}
            >
                {isSubmittingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isSubmittingJob ? "Sending to Agent..." : (isMonitoring ? "Monitoring..." : "Start Ingestion & Monitor")}
            </Button>
        </CardFooter>
      </Card>

      { (ingestionLog.length > 0 || ingestionSummary || currentJobId) && (
        <Card className="shadow-sm mt-4">
          <CardHeader>
            <CardTitle className="text-base">Local Agent Communication Log</CardTitle>
             {currentJobId && !isMonitoring && ingestionSummary && <CardDescription>Job ID: {currentJobId} - Final Status: {ingestionSummary.status}</CardDescription>}
             {currentJobId && isMonitoring && <CardDescription>Monitoring Job ID: {currentJobId}...</CardDescription>}
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={ingestionLog.join('\n')}
              className="h-40 font-mono text-xs bg-muted/30"
              placeholder="Local agent activity log..."
            />
          </CardContent>
        </Card>
      )}

      {ingestionSummary && (
        <Card className="shadow-lg mt-4">
            <CardHeader>
                <CardTitle>Ingestion Summary Report</CardTitle>
                <CardDescription>Job ID: {ingestionSummary.jobId || currentJobId || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow><TableCell className="font-medium">Final Status</TableCell><TableCell><Badge variant={ingestionSummary.status === 'completed' ? 'default' : ingestionSummary.status === 'failed' || ingestionSummary.status === 'cancelled' ? 'destructive' : 'secondary'}>{ingestionSummary.status || 'N/A'}</Badge></TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Message</TableCell><TableCell>{ingestionSummary.message || 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Determined Photographer</TableCell><TableCell>{getPersonnelName(ingestionSummary.determinedPhotographerId) || 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Determined Event</TableCell><TableCell>{getEventName(ingestionSummary.determinedEventId) || 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Files Processed / Total</TableCell><TableCell>{ingestionSummary.filesProcessed ?? 'N/A'} / {ingestionSummary.totalFiles ?? 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Files Matched / Unmatched</TableCell><TableCell>{ingestionSummary.filesMatchedToEvents ?? 'N/A'} / {ingestionSummary.filesUnmatched ?? 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Total Size</TableCell><TableCell>{ingestionSummary.totalSizeMB !== undefined ? `${ingestionSummary.totalSizeMB.toFixed(1)} MB` : 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">Checksum Result</TableCell><TableCell>{ingestionSummary.checksumResult || 'N/A'}</TableCell></TableRow>
                        <TableRow><TableCell className="font-medium">HIVE Shot Requests Updated</TableCell><TableCell>{ingestionSummary.status === 'completed' ? (ingestionSummary.filesMatchedToEvents || ingestionSummary.filesProcessed || 0) : 'N/A'}</TableCell></TableRow>
                        {ingestionSummary.errors && ingestionSummary.errors.length > 0 && (
                            <TableRow><TableCell className="font-medium text-destructive">Errors</TableCell><TableCell className="text-destructive text-xs">{ingestionSummary.errors.join('; ')}</TableCell></TableRow>
                        )}
                        {ingestionSummary.reportUrl && (
                             <TableRow><TableCell className="font-medium">Detailed Report</TableCell><TableCell>
                                <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs">
                                    <a href={ingestionSummary.reportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                        <LinkIcon className="h-3 w-3" /> View Agent Report
                                    </a>
                                </Button>
                            </TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}

       <Alert variant="destructive" className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page initiates and monitors ingestion jobs. The actual file selection (via local agent UI), copying, EXIF parsing, folder creation, and checksums are performed by a **separate local desktop agent application** running on your computer (expected at `http://localhost:8765`). HIVE sends job parameters to this agent and polls for status. Ensure the agent is running and correctly configured (including CORS).
        </AlertDescription>
      </Alert>
    </div>
  );
}
