
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioTower, ListChecks, Clock, AlertTriangle as AlertTriangleIcon, Info, Zap, CheckSquare, LogIn, LogOut, Filter, Camera as CameraIcon, UserCheck } from "lucide-react";
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
// Checkbox was removed as per previous request, direct buttons are used now
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Re-added for Quick Turnaround filter
import { useToast } from "@/hooks/use-toast";
import { initialPersonnelMock, type Personnel } from "@/app/(app)/personnel/page";

// MOCK_CURRENT_USER_ID simulates the logged-in photographer for actions on this page
const MOCK_CURRENT_USER_ID = "user_photog_field_sim"; 
const MOCK_CURRENT_USER_NAME = "Field Photographer";


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
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const getPersonnelNameById = (id?: string): string => {
    if (!id) return "Unknown";
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : "Unknown";
  };

  const todaysCoveredEvents = useMemo(() => {
    if (!currentTime || !eventsForSelectedProjectAndOrg) return [];
    return eventsForSelectedProjectAndOrg.filter(event => {
      const eventTimes = parseEventTimes(event.date, event.time);
      if (!eventTimes) return false;
      const eventStartDate = eventTimes.start;
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
      case "past": return { label: "Completed", variant: "default" };
      default: return { label: "Scheduled", variant: "outline" };
    }
  };

  const getShotProgress = useCallback((eventId: string): { captured: number; total: number } => {
    const shots = getShotRequestsForEvent(eventId);
    const total = shots.length;
    const captured = shots.filter(shot => shot.status === "Captured" || shot.status === "Completed").length;
    return { captured, total };
  }, [getShotRequestsForEvent]);

  const handleShotAction = (eventId: string, shotId: string, action: "toggleCapture" | "toggleBlock") => {
    const shots = getShotRequestsForEvent(eventId);
    const shotToUpdate = shots.find(s => s.id === shotId);
    if (!shotToUpdate) return;

    let updatePayload: Partial<ShotRequestFormData> = {};
    const nowISO = new Date().toISOString();

    if (action === "toggleCapture") {
      if (shotToUpdate.status === "Captured" || shotToUpdate.status === "Completed") {
        updatePayload.status = "Assigned";
        updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
        updatePayload.lastStatusModifiedAt = nowISO;
        updatePayload.initialCapturerId = shotToUpdate.initialCapturerId; // Retain
      } else {
        updatePayload.status = "Captured";
        updatePayload.initialCapturerId = shotToUpdate.initialCapturerId || MOCK_CURRENT_USER_ID;
        updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
        updatePayload.lastStatusModifiedAt = nowISO;
      }
      toast({
        title: "Shot Status Updated",
        description: `Shot "${shotToUpdate.description.substring(0,30)}..." set to ${updatePayload.status}.`
      });
    } else if (action === "toggleBlock") {
      if (shotToUpdate.status === "Blocked") {
        updatePayload.status = "Assigned"; 
        updatePayload.blockedReason = "";
        updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
        updatePayload.lastStatusModifiedAt = nowISO;
        toast({
          title: "Shot Unblocked",
          description: `Shot "${shotToUpdate.description.substring(0,30)}..." set to Assigned.`
        });
      } else {
        const reason = window.prompt("Please provide a reason for blocking this shot:");
        if (reason !== null) { 
          updatePayload.status = "Blocked";
          updatePayload.blockedReason = reason;
          updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
          updatePayload.lastStatusModifiedAt = nowISO;
          toast({
            title: "Shot Blocked",
            description: `Shot "${shotToUpdate.description.substring(0,30)}..." Blocked. Reason: ${reason}`
          });
        } else {
           toast({
            title: "Block Action Cancelled",
            variant: "default",
            description: "Shot status remains unchanged."
          });
          return; 
        }
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      updateShotRequest(eventId, shotId, updatePayload);
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
          Today&apos;s covered events for: <span className="font-semibold text-foreground">{selectedProject.name}</span>.
          (As of: {format(currentTime, "PPPp")})
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filter Today&apos;s Events</CardTitle>
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
                        <SelectItem value="all">All Today&apos;s Events</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
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
            There are no events marked for production coverage scheduled for today ({currentTime ? format(currentTime, "PPP") : 'N/A'}) in &quot;{selectedProject.name}&quot; that match your current filter criteria.
            Adjust filters or check &quot;Events Setup&quot; under the Plan phase.
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
              <AccordionItem value={event.id} key={event.id} className="bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow border">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2 sm:gap-4">
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold flex items-center gap-1.5">
                        {event.name}
                        {event.isQuickTurnaround && <Zap className="h-5 w-5 text-red-500 ml-1.5" title="Quick Turnaround"/>}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {event.time}
                        {event.deadline && <span className="ml-2 text-amber-600 dark:text-amber-400">Deadline: {formatDeadline(event.deadline)}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
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
                                Checked In at {currentUserActivity!.checkInTime ? format(parseISO(currentUserActivity!.checkInTime), "p") : 'N/A'}
                              </Badge>
                            )}
                            {wasCheckedOut && (
                              <Badge variant="outline" className="text-xs">
                                Checked Out at {currentUserActivity!.checkOutTime ? format(parseISO(currentUserActivity!.checkOutTime), "p") : 'N/A'}
                              </Badge>
                            )}
                            {!isCheckedIn && !wasCheckedOut && (
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
                    <div className="space-y-1">
                      {shotsForEvent.map(shot => (
                        <div key={shot.id} className="flex items-center gap-3 p-2.5 rounded-md border bg-background/50 hover:bg-muted/50 transition-colors">
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
                            className="text-xs whitespace-nowrap px-2 py-0.5 flex-shrink-0 w-[120px] justify-center"
                          >
                            {shot.status}
                          </Badge>
                          <p className="flex-1 text-sm text-foreground truncate" title={shot.description}>
                            {shot.description}
                          </p>
                          <div className="flex flex-row gap-1.5 items-center flex-shrink-0">
                            <Button
                              variant={(shot.status === "Captured" || shot.status === "Completed") ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => handleShotAction(event.id, shot.id, 'toggleCapture')}
                              className="text-xs px-2 py-1 h-auto flex-grow-0"
                            >
                              {shot.status === "Captured" || shot.status === "Completed" ? "Uncapture" : "Capture"}
                            </Button>
                            <Button
                              variant={shot.status === "Blocked" ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleShotAction(event.id, shot.id, 'toggleBlock')}
                              className="text-xs px-2 py-1 h-auto flex-grow-0"
                            >
                              {shot.status === "Blocked" ? "Unblock" : "Block"}
                            </Button>
                          </div>
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

