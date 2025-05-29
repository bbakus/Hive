
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UploadCloud, Loader2, CheckCircle, XCircle, Info, ScanLine, RefreshCw, ListChecks, List, KeySquare, HelpCircle, Power, PowerOff, Briefcase, CalendarDays } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEventContext, type Event, type ShotRequest } from '@/contexts/EventContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { initialPersonnelMock, type Personnel } from '@/app/(app)/personnel/page';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { localUtility, type IngestJobStatus, type DriveInfo } from '@/services/localUtility';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
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

  const [ingestionJobs, setIngestionJobs] = useState<IngestJobStatus[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [ingestionLog, setIngestionLog] = useState<string[]>([]); // For HIVE's own actions or errors
  
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  
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
      await localUtility.getAvailableDrives(); // Call to local agent for connection check
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

  const processJobCompletions = useCallback((jobs: IngestJobStatus[]) => {
    let shotsUpdatedCountOverall = 0;
    const updatedJobs = jobs.map(job => {
      if (job.status === 'completed' && !job.hiveProcessedCompletion && job.determinedEventId && job.determinedPhotographerId) {
        const shotsToUpdateCount = job.filesMatchedToEvents ?? job.filesProcessed ?? 0;
        if (shotsToUpdateCount > 0) {
          logMessage(`Updating ${shotsToUpdateCount} shot requests in HIVE for completed Job ID: ${job.jobId}, Event: ${getEventName(job.determinedEventId)}, Photographer: ${getPersonnelName(job.determinedPhotographerId)}...`);
          const allShotsForEvent = getShotRequestsForEvent(job.determinedEventId) || [];
          const unassignedOrAssignedShots = allShotsForEvent.filter(s => s.status === 'Unassigned' || s.status === 'Assigned');
          
          let shotsActuallyUpdatedCount = 0;
          for (let i = 0; i < Math.min(unassignedOrAssignedShots.length, shotsToUpdateCount); i++) {
            const shotToUpdate = unassignedOrAssignedShots[i];
            if (shotToUpdate && shotToUpdate.id) {
              updateShotRequest(job.determinedEventId, shotToUpdate.id, {
                status: 'Captured',
                initialCapturerId: job.determinedPhotographerId,
                lastStatusModifierId: job.determinedPhotographerId, // Assume agent/photog is modifier
                lastStatusModifiedAt: new Date().toISOString(),
              });
              shotsActuallyUpdatedCount++;
            }
          }
          logMessage(`HIVE updated ${shotsActuallyUpdatedCount} shot statuses for Job ID: ${job.jobId}.`);
          if (shotsActuallyUpdatedCount > 0) {
            shotsUpdatedCountOverall += shotsActuallyUpdatedCount;
          }
        }
        return { ...job, hiveProcessedCompletion: true };
      }
      return job;
    });

    if (shotsUpdatedCountOverall > 0) {
      toast({ title: "HIVE Shot Statuses Updated", description: `${shotsUpdatedCountOverall} shot requests across completed jobs were marked as 'Captured'.`});
    }
    return updatedJobs;
  }, [logMessage, getEventName, getPersonnelName, getShotRequestsForEvent, updateShotRequest, toast]);

  const handleFetchIngestionJobs = async () => {
    setIsLoadingJobs(true);
    logMessage("Fetching ingestion job list from HIVE backend...");
    try {
      const fetchedJobs = await localUtility.getIngestionJobsFromHIVE();
      const processedJobs = processJobCompletions(fetchedJobs);
      setIngestionJobs(processedJobs);
      logMessage(`Successfully fetched ${fetchedJobs.length} ingestion jobs.`, 'success');
      toast({ title: "Ingestion Jobs Fetched", description: `Retrieved ${fetchedJobs.length} jobs.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(`Error fetching ingestion jobs: ${errorMessage}`, 'error');
      toast({ title: "Error Fetching Jobs", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingJobs(false);
    }
  };
  
  const AgentStatusIndicator = () => {
    let IconComponent = HelpCircle;
    let textColor = "text-muted-foreground";
    let iconColor = "text-muted-foreground";
    let statusText = "Unknown";

    switch (agentConnectionStatus) {
      case 'connected':
        IconComponent = Power;
        textColor = "text-green-600 dark:text-green-400";
        iconColor = textColor;
        statusText = "Connected";
        break;
      case 'disconnected':
        IconComponent = PowerOff;
        textColor = "text-red-600 dark:text-red-400";
        iconColor = textColor;
        statusText = "Disconnected to Local Agent";
        break;
      case 'checking':
        IconComponent = Loader2;
        textColor = "text-yellow-600 dark:text-yellow-400";
        iconColor = textColor;
        statusText = "Checking...";
        break;
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className={cn("h-5 w-5", iconColor, agentConnectionStatus === 'checking' && "animate-spin")} />
        <span className={textColor}>{statusText}</span>
        <Button variant="ghost" size="sm" onClick={() => verifyAgentConnection(true)} className="h-7 px-2 py-1 text-xs" title="Refresh Connection Status" disabled={agentConnectionStatus === 'checking'}>
           <RefreshCw className={cn("h-3.5 w-3.5", agentConnectionStatus === 'checking' && "animate-spin")} />
        </Button>
      </div>
    );
  };
  
  const isLoadingContexts = isLoadingSettings || isLoadingEvents || isLoadingProjects;

  if (isLoadingContexts && agentConnectionStatus === 'unknown') {
    return <div className="p-4">Loading HIVE context...</div>;
  }
   if (!useDemoData && !isLoadingSettings) { 
     return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Data Disabled</AlertTitle>
        <AlertDescription>
          The Ingestion Job Monitor relies on demo data for context (events, personnel) if not connected to a live backend. Enable "Load Demo Data" in Settings for full UI demonstration.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-accent" /> Ingestion Job Dashboard
        </h1>
        <AgentStatusIndicator />
      </div>
      
      <Alert variant="default">
        <KeySquare className="h-4 w-4" />
        <AlertTitle>Workflow Overview</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
            <p>1. Use your **Local Desktop Ingestion Utility** to select media, destinations, and start the ingestion process. The utility will analyze media to determine Photographer and Event context (querying HIVE APIs or prompting you if needed).</p>
            <p>2. The Local Utility will automatically push job status updates to HIVE's backend.</p>
            <p>3. Click "Refresh Ingestion Data" below to view the list of active and past ingestion jobs as reported to HIVE.</p>
            <p>4. HIVE will automatically update shot statuses for completed jobs based on the agent's report.</p>
        </AlertDescription>
      </Alert>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ingestion Jobs Overview</CardTitle>
          <CardDescription>
            Fetch and display a list of ingestion jobs reported to HIVE by the local utility.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Button 
                onClick={handleFetchIngestionJobs} 
                disabled={isLoadingJobs || agentConnectionStatus !== 'connected'}
             >
                {isLoadingJobs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <List className="mr-2 h-4 w-4" />}
                Refresh Ingestion Data
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
                This will fetch the latest list of jobs and their statuses from HIVE's backend.
            </p>
        </CardContent>
      </Card>

      {ingestionJobs.length > 0 && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Reported Ingestion Jobs</CardTitle>
                <CardDescription>List of jobs reported by the local utility. Last fetched: {new Date().toLocaleTimeString()}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Job ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Photographer</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Report</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ingestionJobs.map((job) => (
                            <TableRow key={job.jobId}>
                                <TableCell className="font-mono text-xs">{job.jobId.substring(0,15)}...</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        job.status === 'completed' ? 'default' :
                                        job.status === 'failed' || job.status === 'cancelled' ? 'destructive' :
                                        'secondary'
                                    }>{job.status}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">{getPersonnelName(job.determinedPhotographerId)}</TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate" title={getEventName(job.determinedEventId)}>{getEventName(job.determinedEventId)}</TableCell>
                                <TableCell className="text-xs">{job.progress !== undefined ? `${job.progress}%` : 'N/A'}</TableCell>
                                <TableCell className="text-xs max-w-[250px] truncate" title={job.message}>{job.message || 'N/A'}</TableCell>
                                <TableCell>
                                    {job.reportUrl ? (
                                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs">
                                            <a href={job.reportUrl} target="_blank" rel="noopener noreferrer">View Report</a>
                                        </Button>
                                    ) : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
      
      {(ingestionLog.length > 0) && (
        <Card className="shadow-sm mt-4">
          <CardHeader>
            <CardTitle className="text-base">HIVE Activity Log</CardTitle>
            <CardDescription>Log of HIVE's interactions or processing related to ingestion jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={ingestionLog.join('\n')}
              className="h-32 font-mono text-xs bg-muted/30"
              placeholder="HIVE activity log..."
            />
          </CardContent>
        </Card>
      )}
       
       <Alert variant="destructive" className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Local Desktop Agent Required</AlertTitle>
        <AlertDescription className="text-xs">
          This HIVE page displays data about ingestion jobs. The actual ingestion process (file selection, copying, EXIF parsing, folder creation, checksums) is performed by a **separate local desktop agent application** running on your computer. That agent is responsible for pushing job status and reports to HIVE's backend APIs. HIVE's "Connected" status refers to its ability to reach the agent for basic handshake.
        </AlertDescription>
      </Alert>
    </div>
  );
}
