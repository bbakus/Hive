
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioTower, ListChecks, Clock, AlertTriangle, Info, Zap, CheckSquare, LogIn, LogOut, Filter, Camera as CameraIcon } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData } from "@/contexts/EventContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { parseEventTimes, formatDeadline } from "@/app/(app)/events/page";
import { isToday, isAfter, isBefore, isWithinInterval, format, parseISO } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { initialPersonnelMock, type Personnel } from "@/app/(app)/personnel/page";

const MOCK_CURRENT_USER_ID = "user_photog_field_sim"; // Simulate a photographer for shot capture

export default function ShootPage() {
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const { 
    eventsForSelectedProjectAndOrg, 
    isLoadingEvents, 
    getShotRequestsForEvent,
    updateShotRequest,
    checkInUserToEvent,
    checkOutUserFromEvent
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const [filterTimeStatus, setFilterTimeStatus] = useState<"all" | "upcoming" | "in_progress" | "past">("all");
  const [filterQuickTurnaround, setFilterQuickTurnaround] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const todaysCoveredEvents = useMemo(() => {
    if (!currentTime || !eventsForSelectedProjectAndOrg) return [];
    return eventsForSelectedProjectAndOrg.filter(event => {
      const eventStartDate = parseEventTimes(event.date, event.time)?.start;
      return eventStartDate && isToday(eventStartDate) && event.isCovered;
    }).sort((a, b) => {
        const timeA = parseEventTimes(a.date, a.time)?.start.getTime() || 0;
        const timeB = parseEventTimes(b.date, b.time)?.start.getTime() || 0;
        return timeA - timeB;
    });
  }, [currentTime, eventsForSelectedProjectAndOrg]);

  const getEventStatus = (event: Event, now: Date): "in_progress" | "upcoming" | "past" => {
    const times = parseEventTimes(event.date, event.time);
    if (!times) return "upcoming"; 

    if (isWithinInterval(now, { start: times.start, end: times.end })) {
      return "in_progress";
    }
    if (isAfter(times.start, now)) {
      return "upcoming";
    }
    return "past";
  };

  const filteredTodaysEvents = useMemo(() => {
    if (!currentTime) return [];
    let filtered = todaysCoveredEvents;

    if (filterQuickTurnaround) {
      filtered = filtered.filter(event => event.isQuickTurnaround);
    }

    if (filterTimeStatus !== "all") {
      filtered = filtered.filter(event => getEventStatus(event, currentTime) === filterTimeStatus);
    }
    return filtered;
  }, [todaysCoveredEvents, filterTimeStatus, filterQuickTurnaround, currentTime]);

  const getEventStatusBadgeInfo = (event: Event): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (!currentTime) return { label: "Pending", variant: "outline" };
    const status = getEventStatus(event, currentTime);
    switch (status) {
      case "in_progress": return { label: "In Progress", variant: "secondary" };
      case "upcoming": return { label: "Upcoming", variant: "outline" };
      case "past": return { label: "Completed", variant: "default" }; // This refers to event timing, not necessarily task completion
      default: return { label: "Scheduled", variant: "outline" };
    }
  };

  const getShotProgress = (eventId: string): { captured: number; total: number } => {
    const shots = getShotRequestsForEvent(eventId);
    const total = shots.length;
    const captured = shots.filter(shot => shot.status === "Captured" || shot.status === "Completed").length;
    return { captured, total };
  };

  const getPersonnelNameById = (id: string): string => {
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : "Unknown User";
  };

  const handleShotCheckChange = (shotId: string, eventId: string, currentShotStatus: ShotRequest['status'], newCheckedState: boolean) => {
    const shotsForEvent = getShotRequestsForEvent(eventId);
    const shotToUpdate = shotsForEvent.find(s => s.id === shotId);

    if (!shotToUpdate) return;

    let newStatus: ShotRequest['status'] | undefined = undefined;
    let updatePayload: Partial<ShotRequestFormData> = {};

    if (newCheckedState) {
      if (currentShotStatus !== "Captured" && currentShotStatus !== "Completed") {
        newStatus = "Captured";
      }
    } else { // Unchecking
      if (currentShotStatus === "Captured") { 
        newStatus = "Assigned"; // Revert to "Assigned" if it was "Captured"
      }
      // If it was "Completed" or other statuses, unchecking does nothing from this quick view
    }

    if (newStatus) {
      updatePayload.status = newStatus;
      const nowISO = new Date().toISOString();

      if (newStatus === "Captured") {
        if (!shotToUpdate.initialCapturerId) {
          updatePayload.initialCapturerId = MOCK_CURRENT_USER_ID;
        }
        updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
        updatePayload.lastStatusModifiedAt = nowISO;
      } else if (newStatus === "Assigned" && currentShotStatus === "Captured") { // Reverting from Captured
        updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID; // Person unchecking
        updatePayload.lastStatusModifiedAt = nowISO;
        // Keep initialCapturerId
      }
      
      updateShotRequest(eventId, shotId, updatePayload);
      toast({
        title: "Shot Status Updated",
        description: `Shot "${shotToUpdate.description.substring(0,30)}..." marked as ${newStatus}.`
      });
    }
  };

  const handleCheckIn = (eventId: string, personnelId: string) => {
    checkInUserToEvent(eventId, personnelId);
    const personName = getPersonnelNameById(personnelId);
    const eventName = eventsForSelectedProjectAndOrg.find(e => e.id === eventId)?.name || "the event";
    toast({
      title: "Checked In",
      description: `${personName} successfully checked in to ${eventName}.`,
    });
  };

  const handleCheckOut = (eventId: string, personnelId: string) => {
    checkOutUserFromEvent(eventId, personnelId);
    const personName = getPersonnelNameById(personnelId);
    const eventName = eventsForSelectedProjectAndOrg.find(e => e.id === eventId)?.name || "the event";
     toast({
      title: "Checked Out",
      description: `${personName} successfully checked out from ${eventName}.`,
    });
  };


  if (isLoadingProjects || isLoadingEvents || isLoadingSettings || currentTime === null) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Shoot Day Operations
        </h1>
        <p>Loading shoot day information...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Shoot Day Operations
        </h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the main navigation to view its live shoot operations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Shoot Day Operations
        </h1>
        <p className="text-muted-foreground">
          Today's covered events for: <span className="font-semibold text-foreground">{selectedProject.name}</span>.
          (As of: {format(currentTime, "PPPp")})
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filter Today's Events</CardTitle>
            <CardDescription>Refine the events shown below for today.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="filter-time-status">Time Status</Label>
                <Select value={filterTimeStatus} onValueChange={(value) => setFilterTimeStatus(value as any)}>
                    <SelectTrigger id="filter-time-status">
                        <SelectValue placeholder="Filter by time status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Today's Events</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="past">Past (Completed)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                    id="filter-quick-turnaround"
                    checked={filterQuickTurnaround}
                    onCheckedChange={(checked) => setFilterQuickTurnaround(!!checked)}
                />
                <Label htmlFor="filter-quick-turnaround" className="font-normal">Quick Turnaround Only</Label>
            </div>
        </CardContent>
      </Card>

      {filteredTodaysEvents.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Covered Events Today Matching Filters</AlertTitle>
          <AlertDescription>
            There are no events marked for production coverage scheduled for today ({format(currentTime, "PPP")}) in "{selectedProject.name}" that match your current filter criteria.
            Adjust filters or check "Events Setup" under the Plan phase.
          </AlertDescription>
        </Alert>
      )}

      {filteredTodaysEvents.length > 0 && (
        <Accordion type="multiple" className="w-full space-y-3">
          {filteredTodaysEvents.map(event => {
            const shotProgress = getShotProgress(event.id);
            const eventStatusBadge = getEventStatusBadgeInfo(event);
            const shotsForEvent = getShotRequestsForEvent(event.id);

            return (
              <AccordionItem value={event.id} key={event.id} className="border bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2 sm:gap-4">
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold flex items-center gap-1.5">
                        {event.isQuickTurnaround && <Zap className="h-5 w-5 text-red-500" title="Quick Turnaround"/>}
                        {event.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {event.time}
                        {event.deadline && <span className="ml-2 text-amber-600 dark:text-amber-400">Deadline: {formatDeadline(event.deadline)}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
                       <Badge variant={event.priority === "Critical" ? "destructive" : event.priority === "High" ? "secondary" : "outline"} className="text-xs">
                        {event.priority}
                      </Badge>
                      <Badge variant={eventStatusBadge.variant} className="text-xs">
                        {eventStatusBadge.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        Shots: {shotProgress.captured} / {shotProgress.total}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                  {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 ? (
                    event.assignedPersonnelIds.map(personnelId => {
                      const person = initialPersonnelMock.find(p => p.id === personnelId);
                      if (!person) return null;

                      const currentUserActivity = event.personnelActivity?.[personnelId];
                      const isCheckedIn = !!currentUserActivity?.checkInTime && !currentUserActivity?.checkOutTime;
                      const wasCheckedOut = !!currentUserActivity?.checkInTime && !!currentUserActivity?.checkOutTime;

                      return (
                        <div key={personnelId} className="mb-4 p-3 border rounded-md bg-muted/30">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                            <div className="mb-2 sm:mb-0">
                                <p className="font-semibold text-sm">{person.name} <span className="text-xs text-muted-foreground">({person.role})</span></p>
                                {person.cameraSerial && <p className="text-xs text-muted-foreground flex items-center gap-1"><CameraIcon className="h-3 w-3" /> S/N: {person.cameraSerial}</p>}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCheckIn(event.id, personnelId)}
                                disabled={isCheckedIn || wasCheckedOut}
                                className="w-full sm:w-auto"
                              > 
                                <LogIn className="mr-2 h-4 w-4"/> Check In
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCheckOut(event.id, personnelId)}
                                disabled={!isCheckedIn || wasCheckedOut}
                                className="w-full sm:w-auto"
                              > 
                                <LogOut className="mr-2 h-4 w-4"/> Check Out
                              </Button>
                            </div>
                          </div>
                          {isCheckedIn && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-green-500"/>
                                Checked In at {format(parseISO(currentUserActivity!.checkInTime!), "p")}
                              </Badge>
                            )}
                            {wasCheckedOut && (
                              <Badge variant="outline" className="text-xs">
                                Checked Out at {format(parseISO(currentUserActivity!.checkOutTime!), "p")}
                              </Badge>
                            )}
                            {!currentUserActivity?.checkInTime && !wasCheckedOut && (
                                 <p className="text-xs text-muted-foreground">Not yet checked in.</p>
                            )}
                             {wasCheckedOut && currentUserActivity?.checkInTime && currentUserActivity.checkOutTime && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Activity: {format(parseISO(currentUserActivity.checkInTime), "p")} - {format(parseISO(currentUserActivity.checkOutTime), "p")}
                                </p>
                            )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No personnel assigned to this event.</p>
                  )}
                  
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Shot Checklist:</h4>
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/events/${event.id}/shots`}>
                        <ListChecks className="mr-2 h-4 w-4" /> Full Shot List & Edit
                      </Link>
                    </Button>
                  </div>
                  {shotsForEvent.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {shotsForEvent.map(shot => (
                        <div key={shot.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 rounded-md border bg-background/50">
                          <Checkbox 
                            id={`shot-check-${event.id}-${shot.id}`} 
                            checked={shot.status === "Captured" || shot.status === "Completed"}
                            onCheckedChange={(checked) => handleShotCheckChange(shot.id, event.id, shot.status, !!checked)}
                            aria-label={`Checkbox for shot ${shot.description}`}
                            className="mt-1 sm:mt-0 flex-shrink-0"
                          /> 
                          <label htmlFor={`shot-check-${event.id}-${shot.id}`} className="flex-1 text-sm text-muted-foreground" title={shot.description}>
                            {shot.description}
                          </label>
                          <Badge 
                             variant={
                                shot.status === "Captured" || shot.status === "Completed" ? "default" :
                                shot.status === "Unassigned" ? "outline" :
                                shot.status === "Assigned" ? "secondary" :
                                shot.status === "Blocked" ? "destructive" :
                                shot.status === "Request More" ? "destructive" : 
                                "outline"
                            }
                            className="text-xs whitespace-nowrap self-start sm:self-center"
                          >
                            {shot.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shot requests defined for this event.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

