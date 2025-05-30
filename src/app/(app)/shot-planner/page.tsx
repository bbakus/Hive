
"use client";

import { useEffect, useState, type FormEvent, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ListChecks, Film, Info } from 'lucide-react';
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData } from '@/contexts/EventContext';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// We might need a dialog for editing later, but not for quick add
// import { ShotRequestFormDialog } from '@/components/modals/ShotRequestFormDialog';

export default function ShotPlannerPage() {
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');

  const { 
    getEventById, 
    getShotRequestsForEvent, 
    addShotRequest,
    updateShotRequest, // For future Edit/Delete
    deleteShotRequest, // For future Edit/Delete
    isLoadingEvents 
  } = useEventContext();
  const { selectedProject } = useProjectContext(); // To display project context if needed
  const { isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentShotRequests, setCurrentShotRequests] = useState<ShotRequest[]>([]);
  const [newShotDescription, setNewShotDescription] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);

  // TODO: States for Edit/Delete dialogs if we implement them here later
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [editingShot, setEditingShot] = useState<ShotRequest | null>(null);

  const fetchEventAndShots = useCallback(() => {
    if (eventIdFromQuery && !isLoadingEvents && !isLoadingSettings) {
      setIsDataLoading(true);
      const event = getEventById(eventIdFromQuery);
      setSelectedEvent(event || null);
      if (event) {
        const shots = getShotRequestsForEvent(eventIdFromQuery);
        setCurrentShotRequests(shots);
      } else {
        setCurrentShotRequests([]);
      }
      setIsDataLoading(false);
    } else if (!eventIdFromQuery) {
      setSelectedEvent(null);
      setCurrentShotRequests([]);
      setIsDataLoading(false);
    }
  }, [eventIdFromQuery, isLoadingEvents, isLoadingSettings, getEventById, getShotRequestsForEvent]);

  useEffect(() => {
    fetchEventAndShots();
  }, [fetchEventAndShots]);

  const handleAddShot = (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!selectedEvent || !newShotDescription.trim()) {
      if (!newShotDescription.trim()) {
        toast({ title: "Error", description: "Shot description cannot be empty.", variant: "destructive" });
      }
      return;
    }

    const shotData: Pick<ShotRequestFormData, 'description' | 'priority' | 'status'> & Partial<ShotRequestFormData> = {
      description: newShotDescription.trim(),
      priority: "Medium", // Default priority for quick add
      status: "Unassigned", // Default status for quick add
    };

    addShotRequest(selectedEvent.id, shotData);
    toast({
      title: "Shot Added",
      description: `"${newShotDescription.trim().substring(0,30)}..." added to ${selectedEvent.name}.`,
    });
    setNewShotDescription('');
    // Re-fetch shots to update the list after adding
    const updatedShots = getShotRequestsForEvent(selectedEvent.id);
    setCurrentShotRequests(updatedShots);
  };
  
  // Placeholder functions for future Edit/Delete
  const openEditShotModal = (shot: ShotRequest) => {
    // setEditingShot(shot);
    // setIsEditModalOpen(true);
    toast({ title: "Edit Feature", description: "Editing shots will be implemented here."});
  };

  const handleDeleteShot = (shotId: string) => {
    // if (selectedEvent) {
    //   deleteShotRequest(selectedEvent.id, shotId);
    //   toast({ title: "Shot Deleted (Placeholder)", description: `Shot ID ${shotId} would be deleted.`});
    //   fetchEventAndShots(); // Re-fetch
    // }
    toast({ title: "Delete Feature", description: "Deleting shots will be implemented here."});
  };


  if (isLoadingSettings || isDataLoading) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <p>Loading event and shot data...</p>
      </div>
    );
  }

  if (!eventIdFromQuery) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Event Selected</AlertTitle>
          <AlertDescription>
            Please navigate to an event's shot list via the "Events Setup" or "Shoot Day Operations" page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <Alert variant="destructive">
          <Film className="h-4 w-4" />
          <AlertTitle>Event Not Found</AlertTitle>
          <AlertDescription>
            The event with ID "{eventIdFromQuery}" could not be found. Please check the event ID or go back.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <p className="text-muted-foreground">
          Planning shots for event: <span className="font-semibold text-foreground">{selectedEvent.name}</span>
          {selectedProject && selectedEvent.projectId === selectedProject.id && (
            <span className="text-sm"> (Project: {selectedProject.name})</span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-6 w-6 text-accent" /> Add New Shot</CardTitle>
          <CardDescription>Quickly add shot requests. Default status is "Unassigned", priority "Medium".</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddShot} className="flex items-end gap-3">
            <div className="flex-grow">
              <Label htmlFor="newShotDescription" className="sr-only">New Shot Description</Label>
              <Input
                id="newShotDescription"
                type="text"
                value={newShotDescription}
                onChange={(e) => setNewShotDescription(e.target.value)}
                placeholder="Enter shot description (e.g., Wide shot of main stage)"
                className="text-base md:text-sm"
              />
            </div>
            <Button type="submit" variant="accent" disabled={!newShotDescription.trim()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Shot
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shot List ({currentShotRequests.length} shots)</CardTitle>
          <CardDescription>Manage and review all shot requests for "{selectedEvent.name}".</CardDescription>
        </CardHeader>
        <CardContent>
          {currentShotRequests.length > 0 ? (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[50%]">Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentShotRequests.map((shot) => (
                    <TableRow key={shot.id}>
                      <TableCell className="font-medium max-w-xs">
                        <p className="truncate" title={shot.description}>{shot.description}</p>
                         {shot.initialCapturerId && (
                           <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              Captured by: {shot.initialCapturerId} {/* TODO: Lookup name */}
                           </p>
                        )}
                        {shot.status === "Blocked" && shot.blockedReason && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1" title={shot.blockedReason}>
                            Blocked: {shot.blockedReason.substring(0, 50)}{shot.blockedReason.length > 50 ? "..." : ""}
                            </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                           variant={
                            shot.status === "Captured" ? "default" :
                            shot.status === "Completed" ? "default" :
                            shot.status === "Unassigned" ? "outline" :
                            shot.status === "Assigned" ? "secondary" :
                            shot.status === "Blocked" ? "destructive" :
                            shot.status === "Request More" ? "destructive" : 
                            "outline"
                           }
                        >
                          {shot.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            shot.priority === "Critical" ? "destructive" :
                            shot.priority === "High" ? "secondary" :
                            shot.priority === "Medium" ? "default" : // Using default for Medium for visibility
                            "outline" // For Low
                          }
                        >
                          {shot.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="hover:text-foreground/80" onClick={() => openEditShotModal(shot)} disabled>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteShot(shot.id)} disabled>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No shot requests defined for this event yet. Add some using the form above!
            </p>
          )}
        </CardContent>
      </Card>
       {/* Placeholder for Edit Shot Dialog - to be implemented if needed later */}
       {/* {isEditModalOpen && editingShot && selectedEvent && (
        <ShotRequestFormDialog
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            editingShotRequest={editingShot}
            onSubmit={(data) => {
                // Handle edit submission
                updateShotRequest(selectedEvent.id, editingShot.id, data);
                toast({ title: "Shot Updated", description: `"${data.description.substring(0,30)}..." updated.` });
                setIsEditModalOpen(false);
                fetchEventAndShots();
            }}
            parentEvent={selectedEvent}
            personnelAssignedToEvent={[]} // TODO: Pass relevant personnel
        />
       )} */}
    </div>
  );
}

