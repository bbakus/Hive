
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, FolderInput, HardDrive, ScanLine } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus } from '@/services/localUtility';

export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, getShotRequestsForEvent, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  // Removed selectedFiles state
  const [ingestionLog, setIngestionLog] = useState<string[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);

  const [sourcePath, setSourcePath] = useState("");
  const [workingPath, setWorkingPath] = useState("");
  const [backupPath, setBackupPath] = useState("");

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
  
  const [availablePaths, setAvailablePaths] = useState<string[]>([]);

  const availablePhotographers = initialPersonnelMock.filter(
    p => PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role === "Photographer" && p.cameraSerial
  );
  
  const selectedPhotographerDetails = initialPersonnelMock.find(p => p.id === selectedPhotographerId);

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : '';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  // Removed handleFileChange function

  const handleStartIngestion = async () => {
    if (!selectedPhotographerId || !selectedEventId ) {
      toast({
        title: 'Missing Information',
        description: 'Please select photographer and event for HIVE context.',
        variant: 'destructive',
      });
      return;
    }
    if (!sourcePath.trim() || !workingPath.trim() || !backupPath.trim()) {
      toast({
        title: 'Missing Paths',
        description: 'Please specify source, working, and backup paths for the local agent.',
        variant: 'destructive',
      });
      return;
    }

    setIsIngesting(true);
    setIngestionLog([]);
    setIngestionSummary(null);
    setCurrentJobId(null);
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    logMessage('Preparing ingestion job...');

    const photographer = initialPersonnelMock.find(p => p.id === selectedPhotographerId);
    const event = eventsForSelectedProjectAndOrg.find(e => e.id === selectedEventId);

    if (!photographer || !event) {
      logMessage('Error: Selected photographer or event not found in HIVE.', 'error');
      toast({ title: 'HIVE Error', description: 'Photographer or event details missing.', variant: 'destructive' });
      setIsIngesting(false);
      return;
    }

    const jobData = {
      photographerId: selectedPhotographerId,
      eventId: selectedEventId,
      sourcePaths: [sourcePath], 
      workingPath: workingPath,
      backupPath: backupPath,
      photographerCameraSerial: photographer.cameraSerial || undefined,
    };

    try {
      logMessage(`Sending job to local agent for Event: "${event.name}", Photographer: "${photographer.name}"...`);
      logMessage(`Job details: Source: ${sourcePath}, Working: ${workingPath}, Backup: ${backupPath}, Camera S/N: ${photographer.cameraSerial || 'N/A'}`);
      
      const result = await localUtility.startIngest(jobData);
      
      if (result.jobId) {
        setCurrentJobId(result.jobId);
        logMessage(`Job submitted to local agent. Job ID: ${result.jobId}. ${result.message || ''}`, 'success');
        toast({ title: 'Job Submitted', description: `Job ID: ${result.jobId}. Polling for status...` });

        const interval = setInterval(async () => {
          const currentJobToPoll = result.jobId; 
          if (!currentJobToPoll) {
             clearInterval(interval);
             setPollingIntervalId(null);
             return;
          }

          try {
            const statusResult: IngestJobStatus = await localUtility.getJobStatus(currentJobToPoll);
            logMessage(`Agent status (${currentJobToPoll}): ${statusResult.status} - ${statusResult.message || ''} (Progress: ${statusResult.progress || 0}%)`);

            if (statusResult.status === 'completed' || statusResult.status === 'failed') {
              clearInterval(interval);
              setPollingIntervalId(null);
              setIsIngesting(false);
              setCurrentJobId(null);
              logMessage(`Ingestion job ${statusResult.status}. ${statusResult.message || ''}`, statusResult.status === 'completed' ? 'success' : 'error');
              
              setIngestionSummary({
                filesProcessed: statusResult.filesProcessed || 0,
                totalSizeMB: statusResult.totalSizeMB || 0,
                shotsUpdated: 0, 
                checksumStatus: statusResult.checksumResult || "N/A",
                finalMessage: statusResult.message,
                errors: statusResult.errors
              });

              if (statusResult.status === 'completed') {
                toast({ title: 'Ingestion Complete', description: statusResult.message || 'Files processed by local agent.' });
                
                let shotsUpdatedCount = 0;
                const shotsForEvent = getShotRequestsForEvent(selectedEventId);
                const updatableShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                
                const filesToConsiderForShotUpdate = statusResult.filesProcessed || 0;
                const shotsToUpdateCount = Math.min(updatableShots.length, filesToConsiderForShotUpdate);

                if (shotsToUpdateCount > 0) {
                  logMessage(`Updating ${shotsToUpdateCount} shot requests in HIVE for event "${event.name}"...`);
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
                } else {
                  logMessage(`No updatable shots found in HIVE for event "${event.name}" or no files reported processed by agent.`);
                }
              } else { 
                toast({ title: 'Ingestion Failed', description: statusResult.message || 'Local agent reported an error.', variant: 'destructive' });
              }
            }
          } catch (statusError: any) {
            logMessage(`Error polling job status: ${statusError.message || String(statusError)}`, 'error');
            clearInterval(interval);
            setPollingIntervalId(null);
            setIsIngesting(false);
            setCurrentJobId(null); 
            toast({ title: 'Polling Error', description: `Could not get status for job. ${statusError.message || String(statusError)}`, variant: 'destructive' });
          }
        }, 3000); 
        setPollingIntervalId(interval);
      } else {
        throw new Error(result.message || "Local agent did not return a Job ID.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Failed to start ingestion job: ${errorMessage}`, 'error');
      toast({ title: 'Ingestion Error', description: errorMessage, variant: 'destructive' });
      setIsIngesting(false);
    }
  };
  
  const handleFetchAvailableDrives = async () => {
    logMessage("Attempting to fetch available drives from local agent...");
    try {
      const drives = await localUtility.getAvailableDrives();
      if (drives && drives.locations) {
        logMessage(`Available drive locations (conceptual): ${drives.locations.join(', ')}`, 'success');
        toast({ title: "Drives Fetched (Conceptual)", description: `Agent reported: ${drives.locations.join(', ')}`});
        setAvailablePaths(drives.locations);
      } else {
        logMessage("No drive locations reported by agent.", 'info');
        setAvailablePaths([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error fetching drives: ${errorMessage}`, 'error');
      toast({ title: 'Drive Fetch Error', description: errorMessage, variant: 'destructive' });
      setAvailablePaths([]);
    }
  };
  
  const isReadyToIngest = selectedPhotographerId && selectedEventId && sourcePath && workingPath && backupPath;

  useEffect(() => {
    setCurrentJobId(null);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    setIngestionSummary(null); 
  }, [selectedPhotographerId, selectedEventId, sourcePath, workingPath, backupPath]);


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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Swift Ingestion Utility
        </h1>
        <p className="text-muted-foreground">
          Interface to trigger a local agent for media ingestion, organization, and shot status updates.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Job Setup</CardTitle>
          <CardDescription>Select photographer, event, and specify paths for the local agent.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="photographer-select">Active Photographer</Label>
              <Select value={selectedPhotographerId} onValueChange={setSelectedPhotographerId} disabled={isIngesting}>
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
              <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isIngesting || !selectedProject}>
                <SelectTrigger id="event-select">
                  <SelectValue placeholder={selectedProject ? "Select event..." : "Select a project first"} />
                </SelectTrigger>
                <SelectContent>
                  {eventsForSelectedProjectAndOrg.filter(e => e.isCovered).map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} ({event.date})
                    </SelectItem>
                  ))}
                  {selectedProject && eventsForSelectedProjectAndOrg.filter(e => e.isCovered).length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">No covered events for this project.</p>
                  )}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground mt-1">Local agent can use image timestamps against this event's time and photographer's check-in/out to confirm matches.</p>
            </div>
            {/* Removed Source Image Files input field */}
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="source-path">Source Path (for Local Agent)</Label>
              <div className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input id="source-path" value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} placeholder="e.g., /Users/editor/Desktop/Card_01" disabled={isIngesting} />
                <Button variant="outline" size="sm" className="h-10 px-3 text-xs" disabled>Browse...</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path the local agent will read from. "Browse" is conceptual for web UI.</p>
            </div>
            <div>
              <Label htmlFor="working-path">Working Destination Path (for Local Agent)</Label>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input id="working-path" value={workingPath} onChange={(e) => setWorkingPath(e.target.value)} placeholder="e.g., /Volumes/ProductionDrive/ProjectX_Working" disabled={isIngesting}/>
                <Button variant="outline" size="sm" className="h-10 px-3 text-xs" disabled>Browse...</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path for primary ingested files by agent. "Browse" is conceptual.</p>
            </div>
            <div>
              <Label htmlFor="backup-path">Backup Destination Path (for Local Agent)</Label>
               <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input id="backup-path" value={backupPath} onChange={(e) => setBackupPath(e.target.value)} placeholder="e.g., //NAS_SERVER/ProjectX_Backup" disabled={isIngesting}/>
                <Button variant="outline" size="sm" className="h-10 px-3 text-xs" disabled>Browse...</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path for backup files by agent. "Browse" is conceptual.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleFetchAvailableDrives} disabled={isIngesting}>
                <Info className="mr-2 h-4 w-4" /> Fetch Drive Info (Conceptual)
            </Button>
            {availablePaths.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                    <p className="font-medium">Agent reported drives (conceptual):</p>
                    <ul className="list-disc list-inside pl-2">
                        {availablePaths.map(p => <li key={p}>{p}</li>)}
                    </ul>
                </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartIngestion} disabled={!isReadyToIngest || isIngesting}>
            {isIngesting && currentJobId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isIngesting && currentJobId ? `Ingesting (Job: ${currentJobId.substring(0,8)}...)` : "Send Job to Local Agent"}
          </Button>
        </CardFooter>
      </Card>

      {ingestionLog.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={ingestionLog.join('\n')}
              className="h-48 font-mono text-xs bg-muted/30"
              placeholder="Ingestion log will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {ingestionSummary && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ingestion Summary Report (from Local Agent)</CardTitle>
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
        <AlertTitle>Local Agent Interaction Notice</AlertTitle>
        <AlertDescription>
          This utility attempts to communicate with a local agent expected to be running at <strong>http://localhost:8765</strong>.
          Ensure the local agent is running and configured for CORS if you encounter connection issues.
          The browser itself CANNOT directly access local/networked file paths or perform file system operations for writing.
          Path inputs are passed to the local agent. "Browse" buttons are conceptual for this web UI.
        </AlertDescription>
      </Alert>
    </div>
  );
}
