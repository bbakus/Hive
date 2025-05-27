
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioTower, ListChecks, Users, Clock, AlertTriangle, Info } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useEventContext, type Event } from "@/contexts/EventContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { parseEventTimes, formatDeadline } from "@/app/(app)/events/page"; // Re-using these helpers
import { isToday, isAfter, isBefore, isWithinInterval, format, set } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ShootPage() {
  const { selectedProject, isLoadingProjects } = useProjectContext();
  const { eventsForSelectedProjectAndOrg, isLoadingEvents } = useEventContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    // Optionally, set an interval to update currentTime for a live feel,
    // but be mindful of performance and re-renders.
    // const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    // return () => clearInterval(timer);
  }, []);

  const todaysCoveredEvents = useMemo(() => {
    if (!currentTime || !eventsForSelectedProjectAndOrg) return [];
    return eventsForSelectedProjectAndOrg.filter(event => {
      const eventDate = parseEventTimes(event.date, event.time)?.start;
      return eventDate && isToday(eventDate) && event.isCovered;
    }).sort((a, b) => {
        const timeA = parseEventTimes(a.date, a.time)?.start.getTime() || 0;
        const timeB = parseEventTimes(b.date, b.time)?.start.getTime() || 0;
        return timeA - timeB;
    });
  }, [currentTime, eventsForSelectedProjectAndOrg]);

  const happeningNowEvents = useMemo(() => {
    if (!currentTime || !todaysCoveredEvents) return [];
    return todaysCoveredEvents.filter(event => {
      const times = parseEventTimes(event.date, event.time);
      return times && isWithinInterval(currentTime, { start: times.start, end: times.end });
    });
  }, [currentTime, todaysCoveredEvents]);

  const upcomingTodayEvents = useMemo(() => {
    if (!currentTime || !todaysCoveredEvents) return [];
    return todaysCoveredEvents.filter(event => {
      const times = parseEventTimes(event.date, event.time);
      return times && isAfter(times.start, currentTime);
    });
  }, [currentTime, todaysCoveredEvents]);

  const completedTodayEvents = useMemo(() => {
    if (!currentTime || !todaysCoveredEvents) return [];
    return todaysCoveredEvents.filter(event => {
      const times = parseEventTimes(event.date, event.time);
      return times && isBefore(times.end, currentTime) && !happeningNowEvents.find(e => e.id === event.id);
    });
  }, [currentTime, todaysCoveredEvents, happeningNowEvents]);

  if (isLoadingProjects || isLoadingEvents || isLoadingSettings || currentTime === null) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Live Schedule & Shoot Operations
        </h1>
        <p>Loading shoot day information...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Live Schedule & Shoot Operations
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
  
  const EventItemCard = ({ event }: { event: Event }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg flex items-center gap-1.5">
                {event.isQuickTurnaround && <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-auto mr-1">Quick Turn</Badge>}
                {event.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {event.time}
                {event.hasOverlap && <AlertTriangle className="ml-1 h-3.5 w-3.5 text-destructive" title="Potential Time Conflict" />}
                </CardDescription>
            </div>
            <Badge variant={
                event.priority === "Critical" ? "destructive" :
                event.priority === "High" ? "secondary" :
                "outline"
            }>{event.priority}</Badge>
        </div>
        {event.deadline && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Deadline: {formatDeadline(event.deadline)}
            </p>
        )}
      </CardHeader>
      <CardContent className="text-xs space-y-1.5">
        {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 && (
          <p className="text-muted-foreground flex items-center">
            <Users className="mr-1.5 h-3.5 w-3.5 opacity-80" />
            Assigned: {event.assignedPersonnelIds.length}
          </p>
        )}
        <p className="text-muted-foreground">Deliverables: {event.deliverables}</p>
      </CardContent>
      <CardContent className="pt-2 pb-4 border-t">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/events/${event.id}/shots`}>
            <ListChecks className="mr-2 h-4 w-4" /> Manage Shot List ({event.shotRequests})
          </Link>
        </Button>
      </CardContent>
    </Card>
  );


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-accent" /> Live Schedule & Shoot Operations
        </h1>
        <p className="text-muted-foreground">
          Overview of today's covered events for: <span className="font-semibold text-foreground">{selectedProject.name}</span>.
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

      {/* Happening Now Section */}
      {happeningNowEvents.length > 0 && (
        <Card className="shadow-lg border-accent">
          <CardHeader>
            <CardTitle className="text-accent flex items-center gap-2">
                <div className="relative flex h-3 w-3 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </div>
                Happening Now ({happeningNowEvents.length})
            </CardTitle>
            <CardDescription>Events currently in progress.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {happeningNowEvents.map(event => <EventItemCard key={`now-${event.id}`} event={event} />)}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Today Section */}
      {upcomingTodayEvents.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Upcoming Today ({upcomingTodayEvents.length})</CardTitle>
            <CardDescription>Events scheduled for later today.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingTodayEvents.map(event => <EventItemCard key={`upcoming-${event.id}`} event={event} />)}
          </CardContent>
        </Card>
      )}

      {/* Completed Today Section */}
      {completedTodayEvents.length > 0 && (
         <Card className="shadow-lg opacity-70">
          <CardHeader>
            <CardTitle>Completed Today ({completedTodayEvents.length})</CardTitle>
            <CardDescription>Events that have finished today.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedTodayEvents.map(event => <EventItemCard key={`completed-${event.id}`} event={event} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

