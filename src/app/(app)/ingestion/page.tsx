
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, HelpCircle, FolderOpen, FileKey } from 'lucide-react';
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

export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, getShotRequestsForEvent, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const [jobIdToMonitor, setJobIdToMonitor] = useState<string>("");
  const [currentMonitoringJobId, setCurrentMonitoringJobId] = useState<string | null>(null);
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

  const availablePhotographers = useMemo(() => {
    return initialPersonnelMock.filter(
      p => PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role === "Photographer" && p.cameraSerial
    );
  }, []);

  const selectedPhotographerDetails = useMemo(() => {
    return initialPersonnelMock.find(p => p.id === selectedPhotographerId);
  }, [selectedPhotographerId]);

  const selectedEventDetails = useMemo(() => {
    return eventsForSelectedProjectAndOrg.find(e => e.id === selectedEventId);
  }, [selectedEventId, eventsForSelectedProjectAndOrg]);

  const relevantEvents = useMemo(() => {
    if (!selectedProject) return [];
    return eventsForSelectedProjectAndOrg.filter(event => event.isCovered);
  }, [selectedProject, eventsForSelectedProjectAndOrg]);

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : 'INFO: ';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  const verifyAgentConnection = useCallback(async () => {
    setAgentConnectionStatus('checking');
    logMessage("Verifying connection to local agent...");
    try {
      // Using getAvailableDrives for a lightweight connection check
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
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInitiateIngestion = async () => {
    const isConnected = await verifyAgentConnection();
    if (!isConnected) {
      toast({ title: 'Agent Not Connected', description: 'Cannot initiate. Please ensure the local agent is running and accessible.', variant: 'destructive'});
      return;
    }

    if (!selectedPhotographerId || !selectedEventId) {
      toast({
        title: 'Missing Information',
        description: 'Please select photographer and event context for HIVE.',
        variant: 'destructive',
      });
      return;
    }
    
    logMessage(`Signaling local agent for Photographer: ${selectedPhotographerDetails?.name}, Event: ${selectedEventDetails?.name}.`);
    logMessage("Please use your local HIVE Ingestion Utility to select paths and start the ingestion process.");
    logMessage("Once the local utility provides a Job ID, enter it below and click 'Start Monitoring Job'.");
    toast({
      title: "Local Agent Signaled (Conceptual)",
      description: "Use your local utility for path selection. Enter the Job ID it provides here to monitor.",
      duration: 7000,
    });
    // No API call here, user now interacts with local agent
  };

  const handleStartMonitoring = () => {
    if (!jobIdToMonitor.trim()) {
      toast({ title: "Job ID Required", description: "Please enter the Job ID provided by your local agent.", variant: "destructive" });
      return;
    }
    if (currentMonitoringJobId && pollingIntervalId) { // Clear previous job if any
        clearInterval(pollingIntervalId);
    }
    setIsMonitoring(true);
    setIngestionLog([]);
    setIngestionSummary(null);
    setCurrentMonitoringJobId(jobIdToMonitor.trim());
    logMessage(`Starting to monitor Job ID: ${jobIdToMonitor.trim()}`);
    
    const interval = setInterval(async () => {
      const currentJobToPoll = jobIdToMonitor.trim(); // Use fresh value from state in closure
       if (!currentJobToPoll) {
             clearInterval(interval);
             setPollingIntervalId(null);
             return;
          }
      try {
        const statusResult: IngestJobStatus = await localUtility.getJobStatus(currentJobToPoll);
        logMessage(`Agent reported status (${currentJobToPoll}): ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress || 0}%)`);

        if (statusResult.status === 'completed' || statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          clearInterval(interval);
          setPollingIntervalId(null);
          setIsMonitoring(false);
          logMessage(`Ingestion job ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');

          setIngestionSummary({
            filesProcessed: statusResult.filesProcessed || 0,
            totalSizeMB: statusResult.totalSizeMB || 0,
            shotsUpdated: 0, // Will be updated after HIVE processing
            checksumStatus: statusResult.checksumResult || "N/A",
            finalMessage: statusResult.message,
            errors: statusResult.errors
          });

          if (statusResult.status === 'completed' && selectedEventId && selectedPhotographerId) {
            toast({ title: 'Ingestion Complete (Agent)', description: statusResult.message || 'Files processed by local agent. Updating HIVE...' });

            let shotsUpdatedCount = 0;
            const shotsForEvent = getShotRequestsForEvent(selectedEventId);
            const updatableShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
            const filesToConsiderForShotUpdate = statusResult.filesProcessed || 0;
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
        logMessage(`Error polling job status for ${currentJobToPoll}: ${statusError.message || String(statusError)}`, 'error');
        if(pollingIntervalId) clearInterval(pollingIntervalId); // Clear interval from outer scope
        setPollingIntervalId(null);
        setIsMonitoring(false);
        toast({ title: 'Polling Error', description: `Could not get status for job ${currentJobToPoll}. ${statusError.message || String(statusError)}`, variant: 'destructive' });
      }
    }, 3000);
    setPollingIntervalId(interval);
  };

  useEffect(() => {
    // Clear previous job tracking when key selections change
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    setCurrentMonitoringJobId(null);
    setIngestionSummary(null);
    setIsMonitoring(false);
    setJobIdToMonitor(""); // Clear entered job ID
  }, [selectedPhotographerId, selectedEventId]);


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
  
  const expectedFolderPath = useMemo(() => {
    if (!selectedEventDetails || !selectedPhotographerDetails) return "[Select Event & Photographer]";
    const eventDate = selectedEventDetails.date ? format(new Date(selectedEventDetails.date.replace(/-/g, '/')), 'yyyyMMdd') : 'EVENT_DATE';
    const eventName = selectedEventDetails.name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const photographerInitials = selectedPhotographerDetails.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'PHOTOG';
    return `[Your_Working_Path]/${eventDate}_${eventName}/${photographerInitials}/`;
  }, [selectedEventDetails, selectedPhotographerDetails]);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Swift Ingestion Utility
        </h1>
        <AgentStatusIndicator />
      </div>
       <p className="text-muted-foreground -mt-6">
          Select context in HIVE, then use your local agent for file operations. Monitor progress here.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Context & Monitoring</CardTitle>
          <CardDescription>
            Set the Photographer and Event context for the ingestion. Your local agent will handle path selection and file operations.
            Then, enter the Job ID from your local agent to monitor its progress in HIVE.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={isMonitoring}>
                <SelectTrigger id="photographer-select">
                  <SelectValue placeholder="Select photographer..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePhotographers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (S/N: {p.cameraSerial || 'N/A'})
                    </SelectItem>
                  ))}
                  {availablePhotographers.length === 0 && <p className="p-2 text-xs text-muted-foreground">No photographers with camera S/N found.</p>}
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
              <Label htmlFor="event-select">Target Event</Label>
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
             <Button onClick={handleInitiateIngestion} disabled={!selectedPhotographerId || !selectedEventId || isMonitoring || agentConnectionStatus !== 'connected'}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Signal Local Agent to Start Ingestion
            </Button>
          </div>

          <div className="space-y-4">
            <div>
                <Label htmlFor="jobIdToMonitor">Job ID from Local Agent</Label>
                <div className="flex items-center gap-2">
                    <FileKey className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Input 
                        id="jobIdToMonitor" 
                        value={jobIdToMonitor} 
                        onChange={(e) => setJobIdToMonitor(e.target.value)} 
                        placeholder="Enter Job ID provided by local agent" 
                        disabled={isMonitoring}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    After initiating with your local utility, enter the Job ID it gives you here.
                </p>
            </div>
            <Button onClick={handleStartMonitoring} disabled={!jobIdToMonitor.trim() || isMonitoring || agentConnectionStatus !== 'connected'}>
                {isMonitoring && currentMonitoringJobId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isMonitoring && currentMonitoringJobId ? `Monitoring (Job: ${currentMonitoringJobId.substring(0,8)}...)` : "Start Monitoring Job"}
            </Button>
            {agentConnectionStatus !== 'connected' && (
              <p className="text-sm text-destructive">Local agent not connected. Cannot signal or monitor.</p>
            )}
            <div className="mt-4 text-sm p-3 border rounded-md bg-muted/30">
              <p className="font-medium text-foreground mb-1">Expected Folder Structure (Reference):</p>
              <p className="text-xs text-muted-foreground font-mono">{expectedFolderPath}</p>
              <p className="text-xs text-muted-foreground mt-1">Your local agent should create a similar structure based on its configuration.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(ingestionLog.length > 0 || isMonitoring) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log</CardTitle>
            {currentMonitoringJobId && <CardDescription>Monitoring Job ID: {currentMonitoringJobId}</CardDescription>}
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
             {currentMonitoringJobId && <CardDescription>Job ID: {currentMonitoringJobId}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Files Processed by Agent: <span className="font-semibold">{ingestionSummary.filesProcessed}</span>
            </p>
            <p className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Total Size Processed: <span className="font-semibold">{ingestionSummary.totalSizeMB} MB</span>
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
            <p className="text-xs text-muted-foreground">This report is based on responses from the local agent. HIVE updates its internal shot statuses upon successful completion by the agent.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Agent Required for File Operations</AlertTitle>
        <AlertDescription>
          This HIVE utility sets the context (Photographer, Event) for an ingestion job. The actual selection of file paths, file copying, and checksums must be handled by a separate **local HIVE desktop agent application** running on your computer. After initiating the job with your local agent, enter the Job ID it provides above to monitor progress and update HIVE shot statuses.
        </AlertDescription>
      </Alert>
    </div>
  );
}

