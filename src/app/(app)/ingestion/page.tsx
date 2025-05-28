
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, User, CalendarDays, Loader2, CheckCircle, XCircle, Info } from 'lucide-react';
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
    setIngestionLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleStartIngestion = async () => {
    if (!selectedPhotographerId || !selectedEventId || !selectedFiles || selectedFiles.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a photographer, an event, and source files.',
        variant: 'destructive',
      });
      return;
    }

    setIsIngesting(true);
    setIngestionLog([]);
    setIngestionSummary(null);
    logMessage('Starting ingestion process...');

    const photographer = initialPersonnelMock.find(p => p.id === selectedPhotographerId);
    const event = eventsForSelectedProjectAndOrg.find(e => e.id === selectedEventId);

    if (!photographer || !event) {
      logMessage('Error: Selected photographer or event not found.');
      toast({ title: 'Error', description: 'Photographer or event details missing.', variant: 'destructive' });
      setIsIngesting(false);
      return;
    }

    logMessage(`Selected Photographer: ${photographer.name} (Camera S/N: ${photographer.cameraSerial || 'N/A'})`);
    logMessage(`Selected Event: ${event.name}`);
    logMessage(`Processing ${selectedFiles.length} file(s)...`);

    let totalSize = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      logMessage(`Simulating processing of: ${selectedFiles[i].name} (${(selectedFiles[i].size / 1024 / 1024).toFixed(2)} MB)`);
      totalSize += selectedFiles[i].size;
      // Simulate delay for processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const totalSizeMB = parseFloat((totalSize / 1024 / 1024).toFixed(2));

    logMessage(`Simulating file routing to: EventData/${event.name.replace(/\s+/g, '_')}/${(photographer.name.split(" ")[0] || "Photog")}_${photographer.id.slice(-4)}/`);

    // Simulate Shot Status Updates
    let shotsUpdatedCount = 0;
    const shotsForEvent = getShotRequestsForEvent(selectedEventId);
    const updatableShots = shotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
    
    const shotsToUpdate = Math.min(updatableShots.length, selectedFiles.length);

    for (let i = 0; i < shotsToUpdate; i++) {
      const shot = updatableShots[i];
      const updatePayload: Partial<ShotRequestFormData> = {
        status: 'Captured',
        initialCapturerId: selectedPhotographerId,
        lastStatusModifierId: selectedPhotographerId,
        lastStatusModifiedAt: new Date().toISOString(),
      };
      try {
        await updateShotRequest(selectedEventId, shot.id, updatePayload);
        logMessage(`Updated status for shot: "${shot.description.substring(0,30)}..." to Captured.`);
        shotsUpdatedCount++;
      } catch (error) {
        logMessage(`Error updating shot "${shot.description.substring(0,30)}...": ${error}`);
      }
       await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
    }

    logMessage('Simulating checksum verification...');
    const checksumStatus = 'Passed (Simulated)'; // Or Math.random() > 0.1 ? 'Passed (Simulated)' : 'Failed (Simulated)';
    logMessage(`Checksums: ${checksumStatus}`);

    setIngestionSummary({
      filesProcessed: selectedFiles.length,
      totalSizeMB: totalSizeMB,
      shotsUpdated: shotsUpdatedCount,
      checksumStatus: checksumStatus,
    });

    logMessage('Ingestion process completed.');
    toast({
      title: 'Ingestion Simulated',
      description: `Processed ${selectedFiles.length} files. ${shotsUpdatedCount} shot requests updated.`,
    });
    setIsIngesting(false);
  };

  const isReadyToIngest = selectedPhotographerId && selectedEventId && selectedFiles && selectedFiles.length > 0;

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
          Simulate ingesting media files, associating them with events/photographers, and updating shot statuses.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Setup</CardTitle>
          <CardDescription>Select the photographer, event, and source files for this ingestion batch.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
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
              <Label htmlFor="source-files">Source Image Files</Label>
              <Input
                id="source-files"
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={isIngesting}
                className="pt-2"
                accept="image/jpeg,image/png,image/gif,image/heic,image/heif,.nef,.arw,.cr2,.cr3,.raf,.orf,.dng"
              />
              <p className="text-xs text-muted-foreground mt-1">Select multiple image files. Folder selection is not supported in this simulation.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Simulated Destination Folders (Conceptual):</Label>
            <div className="p-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
              <p>Working: <span className="font-mono text-foreground/80">destRoot/dayFolder/eventFolder/photographerInitials/</span></p>
              <p>Backup: <span className="font-mono text-foreground/80">backupDestRoot/dayFolder/eventFolder/photographerInitials/</span></p>
              <p className="text-xs mt-1">Actual folder creation and file copying are not performed by this utility.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartIngestion} disabled={!isReadyToIngest || isIngesting}>
            {isIngesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Start Ingestion (Simulated)
          </Button>
        </CardFooter>
      </Card>

      {ingestionLog.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Ingestion Status Panel</CardTitle>
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
            <CardTitle>Ingestion Summary Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Files Processed: <span className="font-semibold">{ingestionSummary.filesProcessed}</span>
            </p>
            <p className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Total Size: <span className="font-semibold">{ingestionSummary.totalSizeMB} MB</span>
            </p>
            <p className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Shot Requests Updated: <span className="font-semibold">{ingestionSummary.shotsUpdated}</span>
            </p>
            <p className="flex items-center gap-2">
              {ingestionSummary.checksumStatus.startsWith('Passed') ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Checksum Status: <span className="font-semibold">{ingestionSummary.checksumStatus}</span>
            </p>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">This is a simulated report. No actual files were moved or verified on your file system.</p>
          </CardFooter>
        </Card>
      )}
       <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertTitle>Simulation Notice</AlertTitle>
        <AlertDescription>
          This utility simulates file ingestion. It does NOT actually select or write to local folders, copy files, perform real checksums, or read EXIF data beyond basic file properties. Updates to shot statuses are made to the client-side application state.
        </AlertDescription>
      </Alert>
    </div>
  );
}
