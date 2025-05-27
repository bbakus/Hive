
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioTower, ListChecks, Users, Clock, AlertTriangle, Info, Zap, CheckCircle, ChevronDown, LogIn, LogOut } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useEventContext, type Event, type ShotRequest } from "@/contexts/EventContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { parseEventTimes, formatDeadline } from "@/app/(app)/events/page"; 
import { isToday, isAfter, isBefore, isWithinInterval, format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function ShootPage() {
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, isLoadingEvents, getShotRequestsForEvent } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute for liveness
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

  const getEventStatus = (event: Event): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (!currentTime) return { label: "Pending", variant: "outline" };
    const times = parseEventTimes(event.date, event.time);
    if (!times) return { label: "Time Error", variant: "destructive" };

    if (isWithinInterval(currentTime, { start: times.start, end: times.end })) {
      return { label: "In Progress", variant: "secondary" };
    }
    if (isAfter(times.start, currentTime)) {
      return { label: "Upcoming", variant: "outline" };
    }
    if (isBefore(times.end, currentTime)) {
      return { label: "Completed", variant: "default" };
    }
    return { label: "Scheduled", variant: "outline" };
  };

  const getShotProgress = (eventId: string): { captured: number; total: number } => {
    const shots = getShotRequestsForEvent(eventId);
    const captured = shots.filter(shot => shot.status === "Captured" || shot.status === "Completed").length;
    return { captured, total: shots.length };
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

      {todaysCoveredEvents.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Covered Events Today</AlertTitle>
          <AlertDescription>
            There are no events marked for production coverage scheduled for today ({format(currentTime, "PPP")}) in the project "{selectedProject.name}".
            Check the "Events Setup" under the Plan phase to schedule or mark events for coverage.
          </AlertDescription>
        </Alert>
      )}

      {todaysCoveredEvents.length > 0 && (
        <Accordion type="multiple" className="w-full space-y-3">
          {todaysCoveredEvents.map(event => {
            const shotProgress = getShotProgress(event.id);
            const eventStatus = getEventStatus(event);
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
                      <Badge variant={eventStatus.variant} className="text-xs">
                        {eventStatus.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        Shots: {shotProgress.captured} / {shotProgress.total}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled> {/* Placeholder */}
                        <LogIn className="mr-2 h-4 w-4"/> Check In
                      </Button>
                      <Button variant="outline" size="sm" disabled> {/* Placeholder */}
                        <LogOut className="mr-2 h-4 w-4"/> Check Out
                      </Button>
                    </div>
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/events/${event.id}/shots`}>
                        <ListChecks className="mr-2 h-4 w-4" /> Full Shot List & Edit
                      </Link>
                    </Button>
                  </div>
                  <Separator className="my-3" />
                  <h4 className="text-sm font-medium mb-2">Shot Checklist:</h4>
                  {shotsForEvent.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {shotsForEvent.map(shot => (
                        <div key={shot.id} className="flex items-center gap-3 p-2 rounded-md border bg-background/50">
                          <Checkbox id={`shot-check-${shot.id}`} disabled checked={shot.status === "Captured" || shot.status === "Completed"} aria-label={`Checkbox for shot ${shot.description}`}/> {/* Placeholder for now */}
                          <label htmlFor={`shot-check-${shot.id}`} className="flex-1 text-sm text-muted-foreground truncate" title={shot.description}>
                            {shot.description}
                          </label>
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
                            className="text-xs whitespace-nowrap"
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
