
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info, FolderInput, HardDrive } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequestFormData } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- API Client Functions ---
const LOCAL_AGENT_BASE_URL = 'http://localhost:8765';

async function startIngestJob(data: {
  photographerId: string;
  eventId: string;
  sourcePaths: string[];
  workingPath: string; // Changed to workingPath for clarity, matching provided example
  backupPath: string;  // Added backupPath
}) {
  try {
    const response = await fetch(`${LOCAL_AGENT_BASE_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to start ingestion job. Server returned an error.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result; // Expecting { jobId: string, message?: string }
  } catch (error) {
    console.error('Error starting ingestion:', error);
    throw error;
  }
}

async function checkJobStatus(jobId: string) {
  try {
    const response = await fetch(`${LOCAL_AGENT_BASE_URL}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get job status. Server returned an error.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json(); // Expecting { status: string, progress?: number, message?: string, filesProcessed?: number, totalSizeMB?: number, errors?: string[] }
  } catch (error) {
    console.error('Error checking job status:', error);
    throw error;
  }
}

// Function to get available drives (conceptual, UI not fully implemented)
async function getAvailableDrives() {
  try {
    const response = await fetch(`${LOCAL_AGENT_BASE_URL}/available-drives`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get available drives. Server returned an error.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json(); // Expecting { locations: string[] } or similar
  } catch (error) {
    console.error('Error getting available drives:', error);
    throw error;
  }
}


export default function IngestionUtilityPage() {
  const { selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, getShotRequestsForEvent, updateShotRequest, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
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
    checksumStatus: string; // Updated to string to reflect agent's report
    finalMessage?: string;
    errors?: string[];
  } | null>(null);

  const availablePhotographers = initialPersonnelMock.filter(
    p => PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role === "Photographer" && p.cameraSerial
  );

  const logMessage = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? 'ERROR: ' : type === 'success' ? 'SUCCESS: ' : '';
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${prefix}${message}`, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    // Cleanup polling interval on component unmount
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleStartIngestion = async () => {
    if (!selectedPhotographerId || !selectedEventId || !selectedFiles || selectedFiles.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select photographer, event, and source files.',
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
      sourcePaths: [sourcePath], // Assuming sourcePath is a single folder path for now
      workingPath: workingPath,
      backupPath: backupPath,
      // You could add more details like file names if needed by your agent, 
      // but typically the agent reads from sourcePaths.
      // files: selectedFiles ? Array.from(selectedFiles).map(f => ({name: f.name, size: f.size})) : []
    };

    try {
      logMessage(`Sending job to local agent for Event: "${event.name}", Photographer: "${photographer.name}"...`);
      logMessage(`Job details: Source: ${sourcePath}, Working: ${workingPath}, Backup: ${backupPath}`);
      const result = await startIngestJob(jobData);
      
      if (result.jobId) {
        setCurrentJobId(result.jobId);
        logMessage(`Job submitted to local agent. Job ID: ${result.jobId}. ${result.message || ''}`, 'success');
        toast({ title: 'Job Submitted', description: `Job ID: ${result.jobId}. Polling for status...` });

        const interval = setInterval(async () => {
          if (currentJobId === null && result.jobId === null) { // Ensure we use the latest jobId
             clearInterval(interval);
             return;
          }
          const currentJobToPoll = currentJobId || result.jobId; // Use the one that's set
          if (!currentJobToPoll) {
             clearInterval(interval);
             return;
          }

          try {
            const statusResult = await checkJobStatus(currentJobToPoll);
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
                shotsUpdated: 0, // Will be updated after processing HIVE side
                checksumStatus: statusResult.checksumResult || statusResult.checksumStatus || "N/A",
                finalMessage: statusResult.message,
                errors: statusResult.errors
              });

              if (statusResult.status === 'completed') {
                toast({ title: 'Ingestion Complete', description: statusResult.message || 'Files processed by local agent.' });
                // Update HIVE shot statuses
                let shotsUpdatedCount = 0;
                const shotsForEvent = getShotRequestsForEvent(selectedEventId);
                const updatableShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
                // Use filesProcessed from agent if available, otherwise selectedFiles.length
                const filesToConsiderForShotUpdate = statusResult.filesProcessed || (selectedFiles ? selectedFiles.length : 0);
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
                      updateShotRequest(selectedEventId, shot.id, updatePayload); // Removed await
                      logMessage(`HIVE status updated for shot: "${shot.description.substring(0,30)}..." to Captured.`);
                      shotsUpdatedCount++;
                    } catch (hiveError) {
                      logMessage(`HIVE Error updating shot "${shot.description.substring(0,30)}...": ${hiveError}`, 'error');
                    }
                  }
                   setIngestionSummary(prev => prev ? {...prev, shotsUpdated: shotsUpdatedCount} : null);
                } else {
                  logMessage(`No updatable shots found in HIVE for event "${event.name}" or no files reported processed by agent.`);
                }
              } else { // Failed
                toast({ title: 'Ingestion Failed', description: statusResult.message || 'Local agent reported an error.', variant: 'destructive' });
              }
            }
          } catch (statusError) {
            logMessage(`Error polling job status: ${statusError instanceof Error ? statusError.message : String(statusError)}`, 'error');
            // Optionally stop polling on error, or let it retry
          }
        }, 3000); // Poll every 3 seconds
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
  
  // Conceptual handler for available drives
  const handleFetchAvailableDrives = async () => {
    logMessage("Attempting to fetch available drives from local agent...");
    try {
      const drives = await getAvailableDrives();
      if (drives && drives.locations) {
        logMessage(`Available drive locations (conceptual): ${drives.locations.join(', ')}`, 'success');
        toast({ title: "Drives Fetched (Conceptual)", description: `Agent reported: ${drives.locations.join(', ')}`});
      } else {
        logMessage("No drive locations reported by agent.", 'info');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error fetching drives: ${errorMessage}`, 'error');
      toast({ title: 'Drive Fetch Error', description: errorMessage, variant: 'destructive' });
    }
  };


  const isReadyToIngest = selectedPhotographerId && selectedEventId && selectedFiles && selectedFiles.length > 0 && sourcePath && workingPath && backupPath;

  useEffect(() => {
    // Clear currentJobId and stop polling if the selections change, forcing a new job submission
    setCurrentJobId(null);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    // Reset summary when inputs change
    setIngestionSummary(null); 
  }, [selectedPhotographerId, selectedEventId, sourcePath, workingPath, backupPath, selectedFiles]);


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
          <CardDescription>Select photographer, event, files, and specify paths for the local agent.</CardDescription>
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
            </div>
             <div>
              <Label htmlFor="source-files">Source Image Files (for HIVE record)</Label>
              <Input
                id="source-files"
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={isIngesting}
                className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
                accept="image/*,.nef,.arw,.cr2,.cr3,.raf,.orf,.dng" // Common image types
              />
              <p className="text-xs text-muted-foreground mt-1">Select files for HIVE context. Actual files processed by agent from Source Path.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="source-path">Source Path (for Local Agent)</Label>
              <div className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-muted-foreground" />
                <Input id="source-path" value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} placeholder="e.g., /Users/editor/Desktop/Card_01" disabled={isIngesting} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path the local agent will read from.</p>
            </div>
            <div>
              <Label htmlFor="working-path">Working Destination Path (for Local Agent)</Label>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input id="working-path" value={workingPath} onChange={(e) => setWorkingPath(e.target.value)} placeholder="e.g., /Volumes/ProductionDrive/ProjectX_Working" disabled={isIngesting}/>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path for primary ingested files by agent.</p>
            </div>
            <div>
              <Label htmlFor="backup-path">Backup Destination Path (for Local Agent)</Label>
               <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input id="backup-path" value={backupPath} onChange={(e) => setBackupPath(e.target.value)} placeholder="e.g., //NAS_SERVER/ProjectX_Backup" disabled={isIngesting}/>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path for backup files by agent.</p>
            </div>
             {/* Conceptual button for getAvailableDrives */}
            <Button type="button" variant="outline" size="sm" onClick={handleFetchAvailableDrives} disabled={isIngesting}>
                <Info className="mr-2 h-4 w-4" /> Fetch Drive Info (Conceptual)
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartIngestion} disabled={!isReadyToIngest || isIngesting}>
            {isIngesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {currentJobId ? `Ingesting Job: ${currentJobId.substring(0,8)}...` : "Send Job to Local Agent"}
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
              {ingestionSummary.checksumStatus?.toLowerCase().includes('pass') ? (
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
            <p className="text-xs text-muted-foreground">This report is based on responses from the local agent. HIVE updates its internal shot statuses upon successful completion.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Agent Interaction Notice</AlertTitle>
        <AlertDescription>
          This utility now attempts to communicate with a local agent expected to be running at <strong>{LOCAL_AGENT_BASE_URL}</strong>.
          Ensure the local agent is running and configured for CORS if you encounter connection issues.
          The browser itself CANNOT directly access local/networked file paths or perform file system operations.
          Path inputs are passed to the local agent.
        </AlertDescription>
      </Alert>
    </div>
  );
}

    