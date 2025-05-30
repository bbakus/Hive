
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
import { useEventContext, type Event, type ShotRequest } from '@/contexts/EventContext';
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

  const { 
    getEventById, 
    getShotRequestsForEvent, 
    addShotRequest,
    updateShotRequest, 
    deleteShotRequest, 
    isLoadingEvents,
    eventsForSelectedProjectAndOrg,
    shotRequestsByEventId,
  } = useEventContext();
  const { selectedProject } = useProjectContext(); 
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { toast } = useToast();

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [expandedAccordionItems, setExpandedAccordionItems] = useState<string[]>([]);
  
  // State for new shot input values, keyed by eventId
  const [newShotInputValues, setNewShotInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsDataLoading(isLoadingSettings || isLoadingEvents);
    if (!isLoadingSettings && !isLoadingEvents && eventIdFromQuery) {
      const eventFromQuery = eventsForSelectedProjectAndOrg.find(e => e.id === eventIdFromQuery);
      if (eventFromQuery) {
        setExpandedAccordionItems(prev => prev.includes(eventIdFromQuery) ? prev : [...prev, eventIdFromQuery]);
      }
    }
  }, [
    eventIdFromQuery, 
    isLoadingEvents, 
    isLoadingSettings, 
    eventsForSelectedProjectAndOrg
  ]);

  const getPersonnelNameById = useCallback((id?: string): string => {
    if (!id) return "Unknown";
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : "Unknown User";
  }, []);


  const handleAddShot = (e: FormEvent<HTMLFormElement>, eventId: string) => {
    e.preventDefault();
    const description = newShotInputValues[eventId]?.trim();

    if (!description) {
      toast({ title: "Error", description: "Shot description cannot be empty.", variant: "destructive" });
      return;
    }

    addShotRequest(eventId, {
      description: description,
      priority: "Medium", 
      status: "Unassigned", 
    });
    toast({
      title: "Shot Added",
      description: `"${description.substring(0,30)}..." added.`,
    });
    // Do NOT clear newShotInputValues[eventId] for rapid fire
  };
  
  const openEditShotModal = (shot: ShotRequest) => {
    toast({ title: "Edit Feature Placeholder", description: `Editing for shot "${shot.description.substring(0,20)}..." is not yet fully implemented here. Use the dedicated shot list page for full editing.`});
  };

  const handleDeleteShot = (eventId: string, shotId: string) => {
    deleteShotRequest(eventId, shotId);
    toast({ title: "Shot Deleted", description: `Shot has been deleted.`});
  };

  const onAccordionValueChange = (value: string[]) => {
    setExpandedAccordionItems(value);
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
          {selectedProject ? `Plan shots for events in ${selectedProject.name}. Expand an event to add and view its shots.` : "Select a project to begin planning shots."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events & Shot Lists ({eventsForSelectedProjectAndOrg.length} events)</CardTitle>
          <CardDescription>Expand an event to view its shot list and add new shots directly.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsForSelectedProjectAndOrg.length > 0 ? (
            <Accordion 
              type="multiple" 
              value={expandedAccordionItems}
              onValueChange={onAccordionValueChange}
              className="w-full space-y-2"
            >
              {eventsForSelectedProjectAndOrg.map((event) => {
                const currentEventShots = shotRequestsByEventId[event.id] || [];
                return (
                  <AccordionItem value={event.id} key={event.id} className={cn("border rounded-none")}>
                    <AccordionTrigger 
                        className="p-3 hover:no-underline text-left" 
                    >
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <p className={cn("font-medium")}>{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.date), "PPP")} ({event.time}) - Shots: {currentEventShots.length}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      <div className="border-t p-3 space-y-3">
                        <form onSubmit={(e) => handleAddShot(e, event.id)} className="flex items-end gap-2">
                          <div className="flex-grow">
                            <Label htmlFor={`newShot-${event.id}`} className="sr-only">New Shot for {event.name}</Label>
                            <Input
                              id={`newShot-${event.id}`}
                              type="text"
                              value={newShotInputValues[event.id] || ''}
                              onChange={(e) => setNewShotInputValues(prev => ({ ...prev, [event.id]: e.target.value }))}
                              placeholder="Enter new shot description and press Enter or Add"
                              className="text-sm"
                            />
                          </div>
                          <Button type="submit" variant="outline" size="sm" disabled={!(newShotInputValues[event.id]?.trim())}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                          </Button>
                        </form>

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
                                        <CheckCircle className="h-3 w-3"/> Initially Captured by: {getPersonnelNameById(shot.initialCapturerId)}
                                      </p>
                                    )}
                                    {shot.status === "Completed" && shot.lastStatusModifierId && (
                                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                                            <User className="h-3 w-3" /> {/* Changed to User for Completed By */}
                                            Completed by: {getPersonnelNameById(shot.lastStatusModifierId)}
                                            {shot.lastStatusModifiedAt ? ` on ${format(parseISO(shot.lastStatusModifiedAt), "MMM d, p")}` : ""}
                                        </p>
                                    )}
                                     {shot.status !== "Completed" && shot.lastStatusModifierId && 
                                        (shot.lastStatusModifierId !== shot.initialCapturerId || !shot.initialCapturerId) && (
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Info className="h-3.5 w-3.5" />
                                            Last update: {getPersonnelNameById(shot.lastStatusModifierId)}
                                            {shot.lastStatusModifiedAt ? ` on ${format(parseISO(shot.lastStatusModifiedAt), "MMM d, p")}`: ""}
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
                                    <Button variant="ghost" size="icon" className="hover:text-foreground/80 h-8 w-8" onClick={() => openEditShotModal(shot)}>
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
              No events found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}. 
              {useDemoData ? ' Add an event or check filters on the Events Setup page.' : ' Add an event to get started.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    

    