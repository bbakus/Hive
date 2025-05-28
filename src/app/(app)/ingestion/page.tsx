
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

  const [ingestionSummary, setIngestionSummary] = useState<{
    filesProcessed: number;
    totalSizeMB: number;
    shotsUpdated: number;
    checksumStatus: 'N/A' | 'Passed (Simulated)' | 'Failed (Simulated)';
  } | null>(null);

  const availablePhotographers = initialPersonnelMock.filter(
    p => PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role === "Photographer" && p.cameraSerial
  );

  const logMessage = (message: string) => {
    setIngestionLog(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev].slice(0, 100)); // Keep last 100 messages
  };

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
    logMessage('Preparing ingestion job for local agent...');

    const photographer = initialPersonnelMock.find(p => p.id === selectedPhotographerId);
    const event = eventsForSelectedProjectAndOrg.find(e => e.id === selectedEventId);

    if (!photographer || !event) {
      logMessage('Error: Selected photographer or event not found.');
      toast({ title: 'Error', description: 'Photographer or event details missing.', variant: 'destructive' });
      setIsIngesting(false);
      return;
    }

    logMessage(`Job Details:`);
    logMessage(`  Photographer: ${photographer.name} (S/N: ${photographer.cameraSerial || 'N/A'})`);
    logMessage(`  Event: ${event.name}`);
    logMessage(`  Source Path: ${sourcePath}`);
    logMessage(`  Working Dest: ${workingPath}`);
    logMessage(`  Backup Dest: ${backupPath}`);
    logMessage(`  Files to process: ${selectedFiles.length}`);
    logMessage('Sent job to local agent (simulated). Waiting for processing...');
    
    // Simulate delay for local agent processing
    await new Promise(resolve => setTimeout(resolve, 1500));


    logMessage(`Local agent reported: Processing ${selectedFiles.length} file(s)...`);

    let totalSize = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      logMessage(`Local agent reported: Copying ${selectedFiles[i].name} (${(selectedFiles[i].size / 1024 / 1024).toFixed(2)} MB)`);
      totalSize += selectedFiles[i].size;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const totalSizeMB = parseFloat((totalSize / 1024 / 1024).toFixed(2));

    logMessage(`Local agent reported: Files copied to working directory: ${workingPath}/EventData/${event.name.replace(/\s+/g, '_')}/${(photographer.name.split(" ")[0] || "Photog")}_${photographer.id.slice(-4)}/`);
    logMessage(`Local agent reported: Files copied to backup directory: ${backupPath}/EventData/... (similar structure)`);


    let shotsUpdatedCount = 0;
    const shotsForEvent = getShotRequestsForEvent(selectedEventId);
    const updatableShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
    const shotsToUpdateCount = Math.min(updatableShots.length, selectedFiles.length);

    if (shotsToUpdateCount > 0) {
      logMessage(`Local agent reported: ${shotsToUpdateCount} files match criteria for shot status updates for event "${event.name}".`);
      for (let i = 0; i < shotsToUpdateCount; i++) {
        const shot = updatableShots[i];
        const updatePayload: Partial<ShotRequestFormData> = {
          status: 'Captured',
          initialCapturerId: selectedPhotographerId,
          lastStatusModifierId: selectedPhotographerId,
          lastStatusModifiedAt: new Date().toISOString(),
        };
        try {
          await updateShotRequest(selectedEventId, shot.id, updatePayload);
          logMessage(`HIVE updated status for shot: "${shot.description.substring(0,30)}..." to Captured.`);
          shotsUpdatedCount++;
        } catch (error) {
          logMessage(`HIVE Error updating shot "${shot.description.substring(0,30)}...": ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } else {
        logMessage(`Local agent reported: No files matched criteria for shot status updates OR no updatable shots for event "${event.name}".`);
    }


    logMessage('Local agent reported: Checksum verification in progress...');
    await new Promise(resolve => setTimeout(resolve, 500));
    const checksumStatus = 'Passed (Simulated)';
    logMessage(`Local agent reported: Checksum verification ${checksumStatus}`);

    setIngestionSummary({
      filesProcessed: selectedFiles.length,
      totalSizeMB: totalSizeMB,
      shotsUpdated: shotsUpdatedCount,
      checksumStatus: checksumStatus,
    });

    logMessage('Ingestion job completed by local agent (simulated).');
    toast({
      title: 'Ingestion Job Sent (Simulated)',
      description: `Local agent processed ${selectedFiles.length} files. ${shotsUpdatedCount} shot requests updated in HIVE.`,
    });
    setIsIngesting(false);
  };

  const isReadyToIngest = selectedPhotographerId && selectedEventId && selectedFiles && selectedFiles.length > 0 && sourcePath && workingPath && backupPath;

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
          <UploadCloud className="h-8 w-8 text-accent" /> Swift Ingestion Utility (Conceptual)
        </h1>
        <p className="text-muted-foreground">
          Interface to (conceptually) trigger a local agent for media ingestion, organization, and shot status updates.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Job Setup</CardTitle>
          <CardDescription>Select photographer, event, files, and specify conceptual paths for the local agent.</CardDescription>
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
              <Label htmlFor="source-files">Source Image Files (from Local Machine)</Label>
              <Input
                id="source-files"
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={isIngesting}
                className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
                accept="image/jpeg,image/png,image/gif,image/heic,image/heif,.nef,.arw,.cr2,.cr3,.raf,.orf,.dng"
              />
              <p className="text-xs text-muted-foreground mt-1">Select multiple image files for processing.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="source-path">Source Path (Conceptual for Local Agent)</Label>
              <div className="flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-muted-foreground" />
                <Input id="source-path" value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} placeholder="e.g., /Users/editor/Desktop/Card_01" disabled={isIngesting} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path the local agent would read from. Browser cannot access this.</p>
            </div>
            <div>
              <Label htmlFor="working-path">Working Destination Path (Conceptual)</Label>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input id="working-path" value={workingPath} onChange={(e) => setWorkingPath(e.target.value)} placeholder="e.g., /Volumes/ProductionDrive/ProjectX_Working" disabled={isIngesting}/>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path for primary ingested files. Browser cannot access this.</p>
            </div>
            <div>
              <Label htmlFor="backup-path">Backup Destination Path (Conceptual)</Label>
               <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input id="backup-path" value={backupPath} onChange={(e) => setBackupPath(e.target.value)} placeholder="e.g., //NAS_SERVER/ProjectX_Backup" disabled={isIngesting}/>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Path for backup files. Browser cannot access this.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartIngestion} disabled={!isReadyToIngest || isIngesting}>
            {isIngesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Send Job to Local Agent (Simulated)
          </Button>
        </CardFooter>
      </Card>

      {ingestionLog.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Local Agent Communication Log (Simulated)</CardTitle>
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
              {ingestionSummary.checksumStatus.startsWith('Passed') ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Agent Checksum Status: <span className="font-semibold">{ingestionSummary.checksumStatus}</span>
            </p>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This is a simulated report based on actions a local agent would perform. No actual files were moved or verified on your file system by HIVE.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Simulation & Security Notice</AlertTitle>
        <AlertDescription>
          This utility simulates interaction with a hypothetical local agent. 
          HIVE (this web application) CANNOT directly access local/networked file paths or perform file system operations like copying or checksums.
          The path inputs are for conceptual demonstration only.
          Updates to shot statuses in HIVE are based on simulated successful processing by this agent.
        </AlertDescription>
      </Alert>
    </div>
  );
}
