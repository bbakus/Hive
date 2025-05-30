
"use client";

import { useEffect, useState, type FormEvent, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ListChecks, Edit, Trash2, Info, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData } from '@/contexts/EventContext';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { initialPersonnelMock } from '@/app/(app)/personnel/page';

export default function ShotPlannerPage() {
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');

  const { selectedProject, isLoadingProjects } = useProjectContext();
  const { 
    eventsForSelectedProjectAndOrg, 
    isLoadingEvents,
    getEventById,
    shotRequestsByEventId,
    getShotRequestsForEvent, 
    addShotRequest,
    deleteShotRequest,
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  
  const [newShotTitleInputValues, setNewShotTitleInputValues] = useState<Record<string, string>>({});
  const [newShotDescriptionInputValues, setNewShotDescriptionInputValues] = useState<Record<string, string>>({});
  
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const [shotLists, setShotLists] = useState<Record<string, ShotRequest[]>>({});

  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getPersonnelNameById = useCallback((id?: string): string => {
    if (!id) return "Unknown";
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : "Unknown User";
  }, []);

  useEffect(() => {
    if (isLoadingEvents || isLoadingSettings || isLoadingProjects) {
      setIsLoadingPageData(true);
      return;
    }
    setIsLoadingPageData(false);

    if (eventIdFromQuery && eventsForSelectedProjectAndOrg.some(e => e.id === eventIdFromQuery)) {
      if (activeAccordionItem !== eventIdFromQuery) {
        setActiveAccordionItem(eventIdFromQuery);
        if (!shotLists[eventIdFromQuery]) {
            const shots = getShotRequestsForEvent(eventIdFromQuery);
            setShotLists(prev => ({ ...prev, [eventIdFromQuery]: shots }));
        }
      }
    } else if (eventsForSelectedProjectAndOrg.length > 0 && !activeAccordionItem) {
      // Default to opening the first event if no specific event is queried and none is active
      // This logic might need adjustment if you prefer no event to be open by default
      const firstEventId = eventsForSelectedProjectAndOrg[0].id;
      setActiveAccordionItem(firstEventId);
      if (!shotLists[firstEventId]) {
         const shots = getShotRequestsForEvent(firstEventId);
         setShotLists(prev => ({ ...prev, [firstEventId]: shots }));
      }
    } else if (eventsForSelectedProjectAndOrg.length === 0) {
        setActiveAccordionItem(undefined); // Clear active item if no events
    }
  }, [
    eventIdFromQuery, 
    eventsForSelectedProjectAndOrg, 
    isLoadingEvents, 
    isLoadingSettings,
    isLoadingProjects,
    activeAccordionItem,
    getShotRequestsForEvent,
    shotLists 
  ]);

  const handleAddShot = (e: FormEvent<HTMLFormElement>, eventId: string) => {
    e.preventDefault();
    const title = newShotTitleInputValues[eventId]?.trim() || "";
    const description = newShotDescriptionInputValues[eventId]?.trim();

    if (!description) {
      toast({ title: "Error", description: "Shot description cannot be empty.", variant: "destructive" });
      return;
    }

    addShotRequest(eventId, {
      title: title,
      description: description,
      priority: "Medium", 
      status: "Unassigned", 
    });
    toast({
      title: "Shot Added",
      description: `"${title || description.substring(0,30)}..." added to event.`,
    });
    
    setNewShotTitleInputValues(prev => ({ ...prev, [eventId]: '' }));
    setNewShotDescriptionInputValues(prev => ({ ...prev, [eventId]: '' }));
    
    setTimeout(() => {
        titleInputRefs.current[eventId]?.focus();
    }, 0);
  };
  
  const handleDeleteShot = (eventId: string, shotId: string) => {
    const eventShots = shotLists[eventId] || [];
    const shot = eventShots.find(s => s.id === shotId);
    deleteShotRequest(eventId, shotId);
    // Update local shotLists state immediately for UI responsiveness
    setShotLists(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter(s => s.id !== shotId)
    }));
    toast({ 
        title: "Shot Deleted", 
        description: `Shot "${shot?.title || shot?.description.substring(0,30)}..." deleted.`,
        variant: "destructive"
    });
  };

  const onAccordionValueChange = (value: string | undefined) => {
    setActiveAccordionItem(value);
    if (value && !shotLists[value]) {
        // Fetch shots if not already loaded for this event
        const shots = getShotRequestsForEvent(value);
        setShotLists(prev => ({ ...prev, [value]: shots }));
    }
  };


  if (isLoadingPageData) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <p>Loading event data and shot lists...</p>
      </div>
    );
  }
  
  if (!selectedProject && !useDemoData && !isLoadingProjects) {
     return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the main header to plan shots for its events.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (eventsForSelectedProjectAndOrg.length === 0 && !isLoadingEvents) {
     return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Events Found</AlertTitle>
          <AlertDescription>
            The selected project <span className="font-semibold">"{selectedProject?.name}"</span> has no events. Please add events on the "Events Setup" page first.
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
          {selectedProject ? `Planning shots for events in ${selectedProject.name}. Expand an event to view its shot list and add new shots directly.` : "Select a project to begin planning shots."}
        </p>
      </div>

      <Card className="border-0">
        <CardHeader>
          <CardTitle>Events &amp; Shot Lists ({eventsForSelectedProjectAndOrg.length} events)</CardTitle>
          <CardDescription>
            Expand an event to view its shot list and add new shots directly. Only one event can be expanded at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsForSelectedProjectAndOrg.length > 0 ? (
            <Accordion 
              type="single" 
              collapsible
              value={activeAccordionItem}
              onValueChange={onAccordionValueChange}
              className="w-full space-y-2"
            >
              {eventsForSelectedProjectAndOrg.map((event) => {
                const currentEventShotsFromState = shotLists[event.id] || getShotRequestsForEvent(event.id); // Ensure fallback
                return (
                  <AccordionItem 
                    value={event.id} 
                    key={event.id} 
                    className={cn(
                      "border-0" // Removed border from AccordionItem
                    )}
                  >
                    <AccordionTrigger 
                        className="p-3 hover:no-underline text-left border rounded-none"  // Added border to trigger
                        // Visual indication if activeAccordionItem matches event.id can be done here if needed
                        // style={activeAccordionItem === event.id ? { borderColor: 'hsl(var(--accent))' } : {}}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <p className={cn("font-medium")}>{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.date), "PPP")} ({event.time}) - Shots: {event.shotRequests}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0 border border-t-0 rounded-none rounded-b-md"> {/* Added border to content */}
                      <div className="p-3 space-y-3">
                        <form onSubmit={(e) => handleAddShot(e, event.id)} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-end gap-2">
                          <div className="w-full">
                            <Label htmlFor={`newShotTitle-${event.id}`} className="text-xs text-muted-foreground">Shot Title (Optional)</Label>
                            <Input
                              id={`newShotTitle-${event.id}`}
                              ref={(el) => titleInputRefs.current[event.id] = el}
                              type="text"
                              value={newShotTitleInputValues[event.id] || ''}
                              onChange={(e) => setNewShotTitleInputValues(prev => ({ ...prev, [event.id]: e.target.value }))}
                              placeholder="e.g., Keynote Opening Wide"
                              className="text-sm h-9 border-accent focus:ring-accent"
                            />
                          </div>
                          <div className="w-full">
                            <Label htmlFor={`newShotDesc-${event.id}`} className="text-xs text-muted-foreground">Shot Description *</Label>
                            <Input
                              id={`newShotDesc-${event.id}`}
                              type="text"
                              value={newShotDescriptionInputValues[event.id] || ''}
                              onChange={(e) => setNewShotDescriptionInputValues(prev => ({ ...prev, [event.id]: e.target.value }))}
                              placeholder="Enter new shot description"
                              className="text-sm h-9 border-accent focus:ring-accent"
                            />
                          </div>
                          <Button type="submit" variant="accent" size="sm" className="h-9 w-full sm:w-auto" disabled={!(newShotDescriptionInputValues[event.id]?.trim())}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                          </Button>
                        </form>

                        {currentEventShotsFromState.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[25%]">Title</TableHead>
                                <TableHead className="w-[35%]">Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentEventShotsFromState.map((shot) => (
                                <TableRow key={shot.id}>
                                  <TableCell className="font-medium max-w-[150px]">
                                    <p className="truncate" title={shot.title || "No Title"}>{shot.title || <span className="italic text-muted-foreground">No Title</span>}</p>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-xs">
                                    <p className="truncate" title={shot.description}>{shot.description}</p>
                                    {shot.initialCapturerId && (
                                      <p className="text-[11px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3"/> Initially Captured by: {getPersonnelNameById(shot.initialCapturerId)}
                                      </p>
                                    )}
                                     {shot.status === "Completed" && shot.lastStatusModifierId && (
                                        <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                                            <UserCheck className="h-3 w-3" />
                                            Completed by: {getPersonnelNameById(shot.lastStatusModifierId)}
                                            {shot.lastStatusModifiedAt ? ` on ${format(parseISO(shot.lastStatusModifiedAt), "MMM d, p")}` : ""}
                                        </p>
                                    )}
                                     {shot.status !== "Completed" && shot.lastStatusModifierId && 
                                        (shot.lastStatusModifierId !== shot.initialCapturerId || !shot.initialCapturerId) && (
                                        <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                                            <Info className="h-3.5 w-3.5" />
                                            Last update: {getPersonnelNameById(shot.lastStatusModifierId)}
                                            {shot.lastStatusModifiedAt ? ` on ${format(parseISO(shot.lastStatusModifiedAt), "MMM d, p")}`: ""}
                                        </p>
                                    )}
                                    {shot.status === "Blocked" && shot.blockedReason && (
                                      <p className="text-[11px] text-destructive mt-1 flex items-center gap-1" title={shot.blockedReason}>
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
                                    <Button variant="ghost" size="icon" className="hover:text-foreground/80 h-8 w-8" disabled>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8" onClick={() => handleDeleteShot(event.id, shot.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-center py-4 text-sm">No shot requests for this event yet. Add some above!</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
            })}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No events found {selectedProject ? `for "${selectedProject.name}"` : "matching your criteria"}. 
              {useDemoData ? ' Add an event or check filters on the Events Setup page.' : ' Add an event to get started.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
