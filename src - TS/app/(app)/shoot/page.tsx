
"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { RadioTower, ListChecks, Clock, AlertTriangle as AlertTriangleIcon, Info, Zap, CheckSquare, LogIn, LogOut, Filter, Camera as CameraIcon } from "lucide-react";
import { useProjectContext } from '../../../contexts/ProjectContext';
import { useSettingsContext } from '../../../contexts/SettingsContext';
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData } from '../../../contexts/EventContext';
import { usePersonnelContext, type Personnel } from "../../../contexts/PersonnelContext";
import { parseEventTimes, formatDeadline } from "../events/page";
import { format, parseISO, isValid, isWithinInterval, isAfter, isBefore, startOfDay } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Accordion } from "../../../components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";
import { BlockedReasonDialog } from "../../../components/modals/BlockedReasonDialog";
import { EventShootAccordionItem } from "../../../components/shoot/EventShootAccordionItem";

const MOCK_CURRENT_USER_ID = "user_photog_field_sim";
const SIMULATED_DEMO_DATE_ISO = "2025-06-04T12:00:00Z"; // Midday, Wednesday June 4th, 2025

type EventTimeStatus = "past" | "in_progress" | "upcoming";

export default function ShootPage() {
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const {
    eventsForSelectedProjectAndOrg, // Ensure this is destructured
    isLoadingEvents,
    getShotRequestsForEvent,
    updateShotRequest,
    checkInUserToEvent,
    checkOutUserFromEvent
  } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { personnelList, isLoadingPersonnel } = usePersonnelContext();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const [filterTimeStatus, setFilterTimeStatus] = useState<"all" | EventTimeStatus>("all");
  const [filterQuickTurnaround, setFilterQuickTurnaround] = useState(false);
  const [filterHidePastEvents, setFilterHidePastEvents] = useState(false);

  const [isBlockedReasonDialogOpen, setIsBlockedReasonDialogOpen] = useState(false);
  const [shotForBlockedReasonDialog, setShotForBlockedReasonDialog] = useState<{ eventId: string; shotId: string; description: string; currentReason: string } | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const nowISO = useMemo(() => new Date().toISOString(), []);


  useEffect(() => {
    if (useDemoData) {
      setCurrentTime(new Date(SIMULATED_DEMO_DATE_ISO));
    } else {
      setCurrentTime(new Date());
      const timer = setInterval(() => setCurrentTime(new Date()), 60000);
      return () => clearInterval(timer);
    }
  }, [useDemoData]);

  const getPersonnelNameById = useCallback((id?: string): string => {
    if (!id || !personnelList) return "Unknown";
    const person = personnelList.find(p => p.id === id);
    return person ? person.name : "Unknown User";
  }, [personnelList]);

  const getEventStatus = useCallback((event: Event, now: Date): EventTimeStatus => {
    const times = parseEventTimes(event.date, event.time);
    if (!times) return "upcoming"; 

    const eventDate = parseISO(event.date);
    if (!isValid(eventDate)) return "upcoming"; 

    const isEventDateToday =
        eventDate.getUTCFullYear() === now.getUTCFullYear() &&
        eventDate.getUTCMonth() === now.getUTCMonth() &&
        eventDate.getUTCDate() === now.getUTCDate();

    if (!isEventDateToday) {
        return isBefore(eventDate, startOfDay(now)) ? "past" : "upcoming";
    }

    if (isWithinInterval(now, { start: times.start, end: times.end })) {
      return "in_progress";
    }
    if (isAfter(times.start, now)) {
      return "upcoming";
    }
    return "past"; 
  }, []);


  const todaysCoveredEvents = useMemo(() => {
    if (!currentTime || !eventsForSelectedProjectAndOrg) return [];

    const statusOrder: Record<EventTimeStatus, number> = {
      in_progress: 2, 
      upcoming: 1,
      past: 0,
    };

    const isEventDateMatchingCurrentTime = (eventDateStr: string): boolean => {
        const eventDate = parseISO(eventDateStr);
        if (!isValid(eventDate)) return false;
        return (
            eventDate.getUTCFullYear() === currentTime.getUTCFullYear() &&
            eventDate.getUTCMonth() === currentTime.getUTCMonth() &&
            eventDate.getUTCDate() === currentTime.getUTCDate()
        );
    };

    return eventsForSelectedProjectAndOrg
      .filter((event: Event) => {
        return isEventDateMatchingCurrentTime(event.date) && event.isCovered;
      })
      .sort((a: Event, b: Event) => {
        const statusA = getEventStatus(a, currentTime);
        const statusB = getEventStatus(b, currentTime);

        if (statusOrder[statusA] !== statusOrder[statusB]) {
          return statusOrder[statusB] - statusOrder[statusA]; 
        }

        const timeA = parseEventTimes(a.date, a.time)?.start.getTime() || 0;
        const timeB = parseEventTimes(b.date, b.time)?.start.getTime() || 0;
        return timeA - timeB; 
      });
  }, [currentTime, eventsForSelectedProjectAndOrg, getEventStatus]);


  const filteredTodaysEvents = useMemo(() => {
    if (!currentTime) return [];
    let filtered = todaysCoveredEvents;

    if (filterQuickTurnaround) {
      filtered = filtered.filter((event: Event) => event.isQuickTurnaround);
    }

    if (filterTimeStatus !== "all") {
      filtered = filtered.filter((event: Event) => getEventStatus(event, currentTime) === filterTimeStatus);
    }

    if (filterHidePastEvents) {
      filtered = filtered.filter((event: Event) => getEventStatus(event, currentTime) !== "past");
    }
    return filtered;
  }, [todaysCoveredEvents, filterTimeStatus, filterQuickTurnaround, filterHidePastEvents, currentTime, getEventStatus]);

  useEffect(() => {
    if (filteredTodaysEvents.length > 0 && !activeAccordionItem) {
      setActiveAccordionItem(filteredTodaysEvents[0].id);
    } else if (filteredTodaysEvents.length === 0 && activeAccordionItem) {
      setActiveAccordionItem(undefined);
    } else if (filteredTodaysEvents.length > 0 && activeAccordionItem && !filteredTodaysEvents.find((e: Event) => e.id === activeAccordionItem)) {
      setActiveAccordionItem(filteredTodaysEvents[0].id);
    }
  }, [filteredTodaysEvents, activeAccordionItem]);


  const getEventStatusBadgeInfo = useCallback((event: Event): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (!currentTime) return { label: "Pending", variant: "outline" };
    const status = getEventStatus(event, currentTime);
    switch (status) {
      case "in_progress": return { label: "In Progress", variant: "secondary" };
      case "upcoming": return { label: "Upcoming", variant: "outline" };
      case "past": return { label: "Completed", variant: "default" };
      default: return { label: "Scheduled", variant: "outline" };
    }
  }, [currentTime, getEventStatus]);

  const getShotProgress = useCallback((eventId: string) => {
    const shots: ShotRequest[] = getShotRequestsForEvent(eventId);
    if (!shots) return { captured: 0, total: 0 };
    const capturedOrCompleted = shots.filter((s: ShotRequest) => s.status === "Captured" || s.status === "Completed").length;
 return {
      captured: capturedOrCompleted,
      total: shots.length,
    };
  }, [getShotRequestsForEvent]);

  const handleShotAction = useCallback((eventId: string, shotId: string, actionType: "toggleCapture" | "toggleBlock") => {
    const shots = getShotRequestsForEvent(eventId);
    const shotToUpdate = shots.find((s: ShotRequest) => s.id === shotId);
    if (!shotToUpdate) return;

    let updatePayload: Partial<ShotRequestFormData> = {};

    if (actionType === 'toggleCapture') {
      if (shotToUpdate.status === "Captured" || shotToUpdate.status === "Completed") {
        updatePayload.status = "Assigned"; 
      } else {
        updatePayload.status = "Captured";
        if (!shotToUpdate.initialCapturerId) {
          updatePayload.initialCapturerId = MOCK_CURRENT_USER_ID;
        }
     }
      updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
      updatePayload.lastStatusModifiedAt = nowISO;
      updateShotRequest(eventId, shotId, updatePayload);
      toast({ title: "Shot Status Updated", description: `Shot set to ${updatePayload.status}.`});

    } else if (actionType === 'toggleBlock') {
      if (shotToUpdate.status === "Blocked") {
        updatePayload.status = "Assigned"; 
        updatePayload.blockedReason = "";
        updatePayload.lastStatusModifierId = MOCK_CURRENT_USER_ID;
        updatePayload.lastStatusModifiedAt = nowISO;
        updateShotRequest(eventId, shotId, updatePayload);
        toast({ title: "Shot Unblocked", description: "Shot status set to Assigned."});
      } else {
        setShotForBlockedReasonDialog({
            eventId,
            shotId,
            description: shotToUpdate.description,
            currentReason: shotToUpdate.blockedReason || ""
        });
        setIsBlockedReasonDialogOpen(true);
      }
    }
  }, [getShotRequestsForEvent, updateShotRequest, toast, setIsBlockedReasonDialogOpen, setShotForBlockedReasonDialog, nowISO]);

  const handleSaveBlockedReason = useCallback((reason: string) => {
    if (!shotForBlockedReasonDialog) return;
    const { eventId, shotId, description } = shotForBlockedReasonDialog;

    const updatePayload: Partial<ShotRequestFormData> = {
      status: "Blocked",
      blockedReason: reason.trim() || "Blocked - (Reason not specified via quick action)",
      lastStatusModifierId: MOCK_CURRENT_USER_ID,
      lastStatusModifiedAt: new Date().toISOString(),
    };

    updateShotRequest(eventId, shotId, updatePayload);
    toast({
      title: "Shot Blocked",
      description: `Shot "${description.substring(0,30)}..." Blocked. Reason: ${updatePayload.blockedReason}`
    });
    setIsBlockedReasonDialogOpen(false);
    setShotForBlockedReasonDialog(null);
  }, [shotForBlockedReasonDialog, updateShotRequest, toast, setIsBlockedReasonDialogOpen, setShotForBlockedReasonDialog]);


  const handleCheckIn = useCallback((eventId: string, personnelId: string) => {
    checkInUserToEvent(eventId, personnelId);
    const personName = getPersonnelNameById(personnelId);
    const eventName = eventsForSelectedProjectAndOrg?.find((e: Event) => e.id === eventId)?.name || "the event";
    toast({
      title: "Checked In",
      description: `${personName} successfully checked in to ${eventName}.`,
    });
  }, [checkInUserToEvent, getPersonnelNameById, eventsForSelectedProjectAndOrg, toast]);

  const handleCheckOut = useCallback((eventId: string, personnelId: string) => {
    checkOutUserFromEvent(eventId, personnelId);
    const personName = getPersonnelNameById(personnelId);
    const eventName = eventsForSelectedProjectAndOrg?.find((e: Event) => e.id === eventId)?.name || "the event";
     toast({
      title: "Checked Out",
      description: `${personName} successfully checked out from ${eventName}.`,
    });
  }, [checkOutUserFromEvent, getPersonnelNameById, eventsForSelectedProjectAndOrg, toast]);

  if (isLoadingProjects || isLoadingEvents || isLoadingSettings || isLoadingPersonnel || currentTime === null) {
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
      {shotForBlockedReasonDialog && (
        <BlockedReasonDialog
            isOpen={isBlockedReasonDialogOpen}
            onOpenChange={setIsBlockedReasonDialogOpen}
            shotDescription={shotForBlockedReasonDialog.description}
            initialReason={shotForBlockedReasonDialog.currentReason}
            onSave={handleSaveBlockedReason}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Shoot Day Operations
        </h1>
        <p className="text-muted-foreground">
          {useDemoData ? `Today's (Simulated: ${format(currentTime, "PPP")})` : "Today's"} covered events for: <span className="font-semibold text-foreground">{selectedProject.name}</span>.
          {useDemoData ? "" : ` (As of: ${format(currentTime, "p")})`}
        </p>
      </div>

       <Card className="p-4 shadow-sm border bg-card/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <Label htmlFor="filter-time-status" className="text-xs text-muted-foreground">Event Status</Label>
                <Select value={filterTimeStatus} onValueChange={(value: "all" | EventTimeStatus) => setFilterTimeStatus(value)}>
                    <SelectTrigger id="filter-time-status" className="h-9">
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
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-end sm:justify-end gap-x-6 gap-y-2">
                <div className="flex items-center space-x-2 justify-end">
                  <Checkbox
                      id="filter-quick-turnaround"
                      checked={filterQuickTurnaround}
                      onCheckedChange={(checked) => setFilterQuickTurnaround(!!checked)}
                  />
                  <Label htmlFor="filter-quick-turnaround" className="font-normal text-sm whitespace-nowrap">Quick Turnaround Only</Label>
                </div>
                <div className="flex items-center space-x-2 justify-end">
                    <Checkbox
                        id="filter-hide-past"
                        checked={filterHidePastEvents}
                        onCheckedChange={(checked) => setFilterHidePastEvents(!!checked)}
                    />
                    <Label htmlFor="filter-hide-past" className="font-normal text-sm whitespace-nowrap">Hide Past Events</Label>
                </div>
            </div>
        </div>
      </Card>

      {filteredTodaysEvents.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Covered Events Today Matching Filters</AlertTitle>
          <AlertDescription>
            There are no events marked for production coverage scheduled for {useDemoData ? `the simulated date (${format(currentTime, "PPP")})` : `today (${format(currentTime, "PPP")})`} in &quot;{selectedProject.name}&quot; that match your current filter criteria.
            Adjust filters or check &quot;Events Setup&quot; under the Plan phase.
          </AlertDescription>
        </Alert>
      )}

      {filteredTodaysEvents.length > 0 && (
        <Accordion
            type="single"
            collapsible
            className="w-full space-y-3"
            value={activeAccordionItem}
            onValueChange={setActiveAccordionItem}
        >
          {filteredTodaysEvents.map((event: Event) => (
            <EventShootAccordionItem
              key={event.id}
              event={event}
              personnelList={personnelList}
              shotRequests={getShotRequestsForEvent(event.id)}
              getPersonnelNameById={getPersonnelNameById}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onShotAction={handleShotAction}
              getEventStatusBadgeInfo={getEventStatusBadgeInfo}
              getShotProgress={getShotProgress}
              isActive={activeAccordionItem === event.id}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}

    