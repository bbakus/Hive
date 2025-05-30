
"use client";

import { useEffect, useState, type FormEvent, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ListChecks, Film, Info, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData } from '@/contexts/EventContext';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ShotPlannerPage() {
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');

  const { 
    getEventById, 
    getShotRequestsForEvent, 
    addShotRequest,
    updateShotRequest, 
    deleteShotRequest, 
    isLoadingEvents,
    eventsForSelectedProjectAndOrg, // Get all events for the current project/org
  } = useEventContext();
  const { selectedProject } = useProjectContext(); 
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [activeEventForInput, setActiveEventForInput] = useState<Event | null>(null);
  const [shotLists, setShotLists] = useState<Record<string, ShotRequest[]>>({});
  const [newShotDescription, setNewShotDescription] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [expandedAccordionItems, setExpandedAccordionItems] = useState<string[]>([]);

  useEffect(() => {
    setIsDataLoading(isLoadingSettings || isLoadingEvents);
    if (!isLoadingSettings && !isLoadingEvents && eventIdFromQuery) {
      const eventFromQuery = eventsForSelectedProjectAndOrg.find(e => e.id === eventIdFromQuery);
      if (eventFromQuery) {
        setActiveEventForInput(eventFromQuery);
        // Pre-expand the accordion for the event from query
        setExpandedAccordionItems(prev => prev.includes(eventIdFromQuery) ? prev : [...prev, eventIdFromQuery]);
        // Pre-load its shot list
        if (!shotLists[eventIdFromQuery]) {
          const shots = getShotRequestsForEvent(eventIdFromQuery);
          setShotLists(prev => ({ ...prev, [eventIdFromQuery]: shots }));
        }
      }
    } else if (!isLoadingSettings && !isLoadingEvents && !activeEventForInput && eventsForSelectedProjectAndOrg.length > 0) {
        // Default to first event if no query param and nothing active
        // setActiveEventForInput(eventsForSelectedProjectAndOrg[0]);
    }
  }, [
    eventIdFromQuery, 
    isLoadingEvents, 
    isLoadingSettings, 
    getEventById, 
    getShotRequestsForEvent, 
    eventsForSelectedProjectAndOrg,
    activeEventForInput, // Added to prevent resetting if already set
    shotLists // Added to re-evaluate if shotLists state changes externally (though unlikely here)
  ]);

  const handleAddShot = (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!activeEventForInput || !newShotDescription.trim()) {
      if (!activeEventForInput) {
        toast({ title: "No Event Selected", description: "Please select an event to add shots to.", variant: "destructive" });
      } else if (!newShotDescription.trim()) {
        toast({ title: "Error", description: "Shot description cannot be empty.", variant: "destructive" });
      }
      return;
    }

    const shotData: Pick<ShotRequestFormData, 'description' | 'priority' | 'status'> & Partial<ShotRequestFormData> = {
      description: newShotDescription.trim(),
      priority: "Medium", 
      status: "Unassigned", 
    };

    addShotRequest(activeEventForInput.id, shotData);
    toast({
      title: "Shot Added",
      description: `"${newShotDescription.trim().substring(0,30)}..." added to ${activeEventForInput.name}.`,
    });
    // setNewShotDescription(''); // DO NOT CLEAR for rapid fire input - User will clear/edit
    // Refresh shot list for the active event
    const updatedShots = getShotRequestsForEvent(activeEventForInput.id);
    setShotLists(prev => ({ ...prev, [activeEventForInput!.id]: updatedShots }));
  };
  
  const openEditShotModal = (shot: ShotRequest) => {
    toast({ title: "Edit Feature Placeholder", description: `Editing for shot "${shot.description.substring(0,20)}..." is not yet fully implemented here. Use the dedicated shot list page for full editing.`});
  };

  const handleDeleteShot = (eventId: string, shotId: string) => {
    // deleteShotRequest(eventId, shotId); // Assuming this function exists and works in context
    // toast({ title: "Shot Deleted (Placeholder)", description: `Shot ID ${shotId} would be deleted.`});
    // const updatedShots = getShotRequestsForEvent(eventId);
    // setShotLists(prev => ({ ...prev, [eventId]: updatedShots }));
    toast({ title: "Delete Feature Placeholder", description: "Deleting shots will be implemented here."});
  };

  const handleAccordionToggle = (eventId: string) => {
    setExpandedAccordionItems(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
    // Load shots if not already loaded
    if (!shotLists[eventId]) {
      const shots = getShotRequestsForEvent(eventId);
      setShotLists(prev => ({ ...prev, [eventId]: shots }));
    }
  };

  const handleSelectEventForInput = (event: Event) => {
    setActiveEventForInput(event);
    if (!shotLists[event.id]) { // Pre-load shots if not already loaded
      const shots = getShotRequestsForEvent(event.id);
      setShotLists(prev => ({ ...prev, [event.id]: shots }));
    }
    // Optionally, expand the accordion for the newly selected event
    setExpandedAccordionItems(prev => prev.includes(event.id) ? prev : [...prev, event.id]);
  };

  if (isDataLoading) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <p>Loading event data...</p>
      </div>
    );
  }
  
  if (!selectedProject && !useDemoData) {
     return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the main header to plan shots.
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
          {selectedProject ? `Quickly add and review shot requests for events in ${selectedProject.name}.` : "Select a project to begin planning shots."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-6 w-6 text-accent" /> Add New Shot</CardTitle>
          <CardDescription>
            Select an event from the list below to target it for new shots. Input description and press Enter or click "Add Shot".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Label htmlFor="active-event-display">Adding shots for:</Label>
            <Input 
              id="active-event-display" 
              readOnly 
              value={activeEventForInput ? `${activeEventForInput.name} (on ${format(parseISO(activeEventForInput.date), "MMM d")})` : "No event selected"}
              className="bg-muted text-sm"
            />
          </div>
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
                disabled={!activeEventForInput}
              />
            </div>
            <Button type="submit" variant="accent" disabled={!activeEventForInput || !newShotDescription.trim()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Shot
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events & Their Shots ({eventsForSelectedProjectAndOrg.length} events)</CardTitle>
          <CardDescription>Expand an event to view its shot list. Click "Set for Input" to target an event for adding new shots.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsForSelectedProjectAndOrg.length > 0 ? (
            <Accordion 
              type="multiple" 
              value={expandedAccordionItems}
              onValueChange={setExpandedAccordionItems} // Allows manual control of expanded items
              className="w-full space-y-2"
            >
              {eventsForSelectedProjectAndOrg.map((event) => {
                const currentEventShots = shotLists[event.id] || [];
                const isSelectedForInput = activeEventForInput?.id === event.id;

                return (
                  <AccordionItem value={event.id} key={event.id} className={cn("border rounded-none", isSelectedForInput && "border-accent ring-1 ring-accent")}>
                    <AccordionTrigger 
                        className="p-3 hover:no-underline text-left" 
                        onClick={() => handleAccordionToggle(event.id)} // Use custom toggle to load data
                    >
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <p className={cn("font-medium", isSelectedForInput && "text-accent")}>{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.date), "PPP")} ({event.time}) - Shots: {currentEventShots.length}
                          </p>
                        </div>
                        <Button 
                            variant={isSelectedForInput ? "accent" : "outline"} 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleSelectEventForInput(event); }}
                            className="ml-4 h-auto py-1 px-2 text-xs"
                        >
                          {isSelectedForInput ? "Selected for Input" : "Set for Input"}
                        </Button>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      <div className="border-t p-3">
                        {currentEventShots.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60%]">Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentEventShots.map((shot) => (
                                <TableRow key={shot.id}>
                                  <TableCell className="font-medium max-w-xs">
                                    <p className="truncate" title={shot.description}>{shot.description}</p>
                                    {shot.initialCapturerId && (
                                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3"/> Captured
                                      </p>
                                    )}
                                    {shot.status === "Blocked" && shot.blockedReason && (
                                      <p className="text-xs text-destructive mt-1 flex items-center gap-1" title={shot.blockedReason}>
                                        <AlertTriangle className="h-3 w-3"/> {shot.blockedReason.substring(0, 50)}{shot.blockedReason.length > 50 ? "..." : ""}
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      shot.status === "Captured" || shot.status === "Completed" ? "default" :
                                      shot.status === "Assigned" ? "secondary" :
                                      shot.status === "Blocked" || shot.status === "Request More" ? "destructive" : 
                                      "outline"
                                    }>{shot.status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      shot.priority === "Critical" ? "destructive" :
                                      shot.priority === "High" ? "secondary" :
                                      "default"
                                    }>{shot.priority}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="hover:text-foreground/80 h-8 w-8" onClick={() => openEditShotModal(shot)} disabled>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8" onClick={() => handleDeleteShot(event.id, shot.id)} disabled>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-center py-4 text-sm">No shot requests for this event yet.</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
            })}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No events found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}. 
              {useDemoData ? ' Add an event or check filters on the Events Setup page.' : ' Add an event to get started.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    