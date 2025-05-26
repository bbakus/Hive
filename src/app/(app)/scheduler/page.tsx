
"use client";

import { useState, type FormEvent, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Wand2, Loader2, Printer, Info, AlertCircle, ListChecks, CheckSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from "@/ai/flows/smart-schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useEventContext, type Event } from "@/contexts/EventContext"; 
import type { ShotRequest } from "@/app/(app)/events/[eventId]/shots/page";
import { initialPersonnelMock } from "@/app/(app)/personnel/page"; 

// Using a more generic name for the mock data as it's used across the app
// This data is filtered by project context on the scheduler page
// This specific mock is less relevant now that EventContext is used for real data, but keep for shot requests
const allEventsDataMockForScheduler: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 3, assignedPersonnelIds: ["user001", "user002", "user006"], isCovered: true },
    { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 1, assignedPersonnelIds: ["user003", "user007"], isCovered: true },
];

const allAvailablePersonnelMockForScheduler: { id: string; name: string; role: string }[] = initialPersonnelMock;

const initialShotRequestsMockForScheduler: ShotRequest[] = [
  { id: "sr001", eventId: "evt001", description: "Opening wide shot of the crowd (Main Stage D1)", shotType: "Wide", priority: "High", status: "Planned", notes: "Get this as gates open" },
  { id: "sr002", eventId: "evt001", description: "Close-up of lead singer - Song 3 (Main Stage D1)", shotType: "Close-up", priority: "Critical", status: "Planned" },
  { id: "sr003", eventId: "evt001", description: "Audience reaction shots (Main Stage D1)", shotType: "B-Roll", priority: "Medium", status: "Planned" },
  { id: "sr004", eventId: "evt002", description: "Speaker walking onto stage (Keynote)", shotType: "Medium", priority: "High", status: "Captured" },
  { id: "sr005", eventId: "evt004", description: "Interactions with fans (Artist Meet & Greet)", shotType: "B-Roll", priority: "Medium", status: "Planned" },
  { id: "sr006", eventId: "evt006", description: "Wide shot of workshop attendees (Workshop Alpha)", shotType: "Wide", priority: "Low", status: "Planned"},
  { id: "sr007", eventId: "evt006", description: "Instructor teaching (Workshop Alpha)", shotType: "Medium", priority: "Medium", status: "Assigned"},
];


interface ParsedScheduleItem {
  time: string;
  task: string;
  matchedEventId?: string;
}

interface ParsedSchedulePerson {
  name: string;
  items: ParsedScheduleItem[];
}

type ParsedSchedule = ParsedSchedulePerson[];

const parseScheduleString = (scheduleString: string, eventsForDay: Event[]): ParsedSchedule => {
  const parsed: ParsedSchedule = [];
  if (!scheduleString) return parsed;

  const lines = scheduleString.split('\n').filter(line => line.trim() !== '');
  let currentPerson: ParsedSchedulePerson | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const personMatch = trimmedLine.match(/^([\w\s.-]+):$/i);

    if (personMatch) {
      if (currentPerson && currentPerson.items.length > 0) {
        parsed.push(currentPerson);
      }
      currentPerson = { name: personMatch[1].trim(), items: [] };
    } else if (currentPerson) {
      const itemMatch = trimmedLine.match(/^(\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?)\s*:\s*(.+)/i);
      let taskDescription = itemMatch ? itemMatch[2].trim() : trimmedLine;
      let taskTime = itemMatch ? itemMatch[1].trim() : "General";
      let matchedEventId: string | undefined = undefined;

      if (eventsForDay && eventsForDay.length > 0) {
        for (const event of eventsForDay) {
          if (event.name && taskDescription.toLowerCase().includes(event.name.toLowerCase())) {
            matchedEventId = event.id;
            break;
          }
        }
      }

      currentPerson.items.push({
        time: taskTime,
        task: taskDescription,
        matchedEventId: matchedEventId
      });

    } else if (trimmedLine && !parsed.length && !currentPerson) {
        currentPerson = { name: "General Schedule Tasks", items: [] };
        const itemMatch = trimmedLine.match(/^(\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?)\s*:\s*(.+)/i);
        if (itemMatch) {
            currentPerson.items.push({ time: itemMatch[1].trim(), task: itemMatch[2].trim() });
        } else {
            currentPerson.items.push({ time: "Task", task: trimmedLine });
        }
    }
  }

  if (currentPerson && currentPerson.items.length > 0) {
    parsed.push(currentPerson);
  }

  if (parsed.length === 0 && scheduleString.trim()) {
    return [{
        name: "Generated Schedule",
        items: scheduleString.split('\n').filter(line => line.trim() !== '').map(line => ({ time: "Details", task: line.trim() }))
    }];
  }
  return parsed;
};


export default function SchedulerPage() {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId, selectedProject } = useProjectContext();
  const { eventsForSelectedProjectAndOrg: allProjectEvents, isLoadingEvents: isLoadingContextEvents, updateEvent } = useEventContext();
  const { toast } = useToast();

  const [currentProjectEvents, setCurrentProjectEvents] = useState<Event[]>([]);
  const [selectedDateString, setSelectedDateString] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [selectedPersonnelNames, setSelectedPersonnelNames] = useState<string[]>([]);
  const [eventType, setEventType] = useState("");
  const [additionalCriteria, setAdditionalCriteria] = useState("Ensure regular breaks for all personnel. Prioritize main stage coverage if applicable.");

  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOutput, setScheduleOutput] = useState<GenerateScheduleOutput | null>(null);
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule>([]);
  const [isScheduleApplied, setIsScheduleApplied] = useState(false);

  const [projectEventDates, setProjectEventDates] = useState<string[]>([]);
  const [projectPersonnel, setProjectPersonnel] = useState<{ id: string; name: string; role: string }[]>([]);

  useEffect(() => {
    if (isLoadingSettings || isLoadingContextEvents) return;
    setScheduleOutput(null);
    setParsedSchedule([]);
    setIsScheduleApplied(false);

    let relevantEvents = allProjectEvents;
    if(selectedProjectId && useDemoData) {
      relevantEvents = allProjectEvents.filter(event => event.projectId === selectedProjectId && event.isCovered);
    } else if (!useDemoData) {
      relevantEvents = allProjectEvents.filter(event => event.isCovered); // show non-demo covered events
    } else {
      relevantEvents = [];
    }
    setCurrentProjectEvents(relevantEvents);


    const uniqueDates = Array.from(new Set(relevantEvents.map(event => event.date))).sort();
    setProjectEventDates(uniqueDates);

    if (uniqueDates.length > 0) {
      if (!selectedDateString || !uniqueDates.includes(selectedDateString)) {
          setSelectedDateString(uniqueDates[0]);
      }
    } else {
      setSelectedDateString(undefined);
    }

    const personnelIdsInProjectEvents = new Set<string>();
    relevantEvents.forEach(event => {
      event.assignedPersonnelIds?.forEach(id => personnelIdsInProjectEvents.add(id));
    });

    const filteredPersonnel = allAvailablePersonnelMockForScheduler.filter(p => personnelIdsInProjectEvents.has(p.id));
    setProjectPersonnel(filteredPersonnel);
    // Preserve selection if still valid, otherwise clear (or select all/default)
    setSelectedPersonnelNames(prev => prev.filter(name => filteredPersonnel.some(p => p.name === name)));


  }, [selectedProjectId, useDemoData, isLoadingSettings, allProjectEvents, isLoadingContextEvents]);

   useEffect(() => {
    if (projectEventDates.length > 0 && (!selectedDateString || !projectEventDates.includes(selectedDateString))) {
      setSelectedDateString(projectEventDates[0]);
    } else if (projectEventDates.length === 0) {
      setSelectedDateString(undefined);
    }
  }, [projectEventDates, selectedDateString]);


  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDateString) return [];
    return currentProjectEvents.filter(event => event.date === selectedDateString && event.isCovered);
  }, [selectedDateString, currentProjectEvents]);


  const handlePersonnelChange = (personnelName: string, checked: boolean) => {
    setSelectedPersonnelNames(prev =>
      checked ? [...prev, personnelName] : prev.filter(name => name !== personnelName)
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDateString) {
      toast({ title: "Error", description: "Please select a date.", variant: "destructive" });
      return;
    }
    if (selectedPersonnelNames.length === 0) {
      toast({ title: "Error", description: "Please select at least one personnel member.", variant: "destructive" });
      return;
    }
    if (!selectedProject) {
        toast({ title: "Error", description: "Please select a project first.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setScheduleOutput(null);
    setParsedSchedule([]);
    setIsScheduleApplied(false);


    const projectEventsForDateInput = eventsForSelectedDate
      .filter(event => event.isCovered) // Ensure only covered events are sent to AI
      .map(event => ({
        name: event.name,
        time: event.time,
      }));

    const input: GenerateScheduleInput = {
      date: selectedDateString,
      location: location.trim() || undefined,
      personnel: selectedPersonnelNames,
      eventType: eventType.trim() || undefined,
      projectEventsForDate: projectEventsForDateInput.length > 0 ? projectEventsForDateInput : undefined,
      additionalCriteria: additionalCriteria.trim() || undefined,
    };

    try {
      const result = await generateSchedule(input);
      setScheduleOutput(result);
      if (result.schedule) {
        setParsedSchedule(parseScheduleString(result.schedule, eventsForSelectedDate));
      }
      toast({
        title: "Schedule Generated",
        description: "The smart schedule has been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySchedule = () => {
    if (!parsedSchedule.length || !currentProjectEvents.length) {
        toast({ title: "No Schedule or Events", description: "Cannot apply schedule.", variant: "destructive" });
        return;
    }

    let assignmentsMadeCount = 0;
    const updatedEventsMap = new Map<string, Event>();
    currentProjectEvents.forEach(ev => updatedEventsMap.set(ev.id, { ...ev, assignedPersonnelIds: [...(ev.assignedPersonnelIds || [])] }));


    parsedSchedule.forEach(person => {
        const personnel = allAvailablePersonnelMockForScheduler.find(p => p.name === person.name);
        if (!personnel) return;

        person.items.forEach(item => {
            if (item.matchedEventId) {
                const eventToUpdate = updatedEventsMap.get(item.matchedEventId);
                if (eventToUpdate) {
                    if (!eventToUpdate.assignedPersonnelIds?.includes(personnel.id)) {
                        eventToUpdate.assignedPersonnelIds = [...(eventToUpdate.assignedPersonnelIds || []), personnel.id];
                        assignmentsMadeCount++;
                        updatedEventsMap.set(item.matchedEventId, eventToUpdate); // Ensure map has updated version
                    }
                }
            }
        });
    });
    
    updatedEventsMap.forEach(updatedEvent => {
        const originalEvent = allProjectEvents.find(e => e.id === updatedEvent.id);
        // Check if assignments actually changed before calling updateEvent
        const originalAssignments = JSON.stringify((originalEvent?.assignedPersonnelIds || []).sort());
        const newAssignments = JSON.stringify((updatedEvent.assignedPersonnelIds || []).sort());

        if(originalAssignments !== newAssignments) {
           updateEvent(updatedEvent.id, { assignedPersonnelIds: updatedEvent.assignedPersonnelIds });
        }
    });
    
    setIsScheduleApplied(true);

    if (assignmentsMadeCount > 0) {
        toast({
            title: "Schedule Applied (Locally to Context)",
            description: `${assignmentsMadeCount} new assignment(s) reflected. These changes affect the shared EventContext and will be visible on other pages like the Events page.`,
            duration: 7000,
        });
    } else {
        toast({
            title: "Schedule Reviewed (Locally to Context)",
            description: "No new personnel assignments were made based on the schedule. Existing assignments checked.",
            duration: 7000,
        });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingSettings || isLoadingContextEvents) {
    return <div className="p-4">Loading scheduler settings and event data...</div>;
  }

  const isSchedulerFormDisabled = !selectedProjectId || (!useDemoData && allProjectEvents.filter(e=>e.isCovered).length === 0);


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-8 w-8 text-accent icon-glow" /> Smart Schedule Generator
        </h1>
        <p className="text-muted-foreground">
          {selectedProject ? `Generating schedule for ${selectedProject.name}. ` : "Select a project to begin. "}
           Dynamically generate per-day and per-person schedule views using AI for events marked as "Covered".
        </p>
      </div>

      {isSchedulerFormDisabled && (
        <Alert variant="default" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scheduler Disabled or No Covered Events</AlertTitle>
          <AlertDescription>
            {!useDemoData && allProjectEvents.filter(e=>e.isCovered).length === 0 && selectedProjectId
                ? "The selected project has no events marked for production coverage. Please mark events as 'covered' on the Events page to use the scheduler."
                : (!useDemoData ? "Demo data is currently turned off. Please enable it in settings or ensure your selected project has covered events." : "Please select a project from the main navigation to enable the scheduler.")
            }
          </AlertDescription>
        </Alert>
      )}

      <Card className={cn("shadow-lg", isSchedulerFormDisabled && "opacity-50 pointer-events-none")}>
        <CardHeader>
          <CardTitle>Generate New Schedule</CardTitle>
          <CardDescription>
            Provide details to generate an optimized schedule for covered events. Date and Personnel are dynamically populated based on the selected project's covered events.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="date-select">Date <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedDateString || ""}
                  onValueChange={setSelectedDateString}
                  disabled={projectEventDates.length === 0 || isSchedulerFormDisabled}
                >
                  <SelectTrigger id="date-select" className={(!selectedDateString && projectEventDates.length > 0) ? "text-muted-foreground" : ""}>
                    <SelectValue placeholder={projectEventDates.length > 0 ? "Select a date" : (selectedProject ? "No covered event dates for this project" : "Select project")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projectEventDates.map(dateStr => (
                      <SelectItem key={dateStr} value={dateStr}>
                        {format(parseISO(dateStr), "PPP")} ({format(parseISO(dateStr), "eeee")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Select a date that has covered events scheduled for the current project.</p>
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Stage, Hall B" disabled={isSchedulerFormDisabled} />
                 <p className="text-xs text-muted-foreground mt-1">Optional. Specify a general event area (e.g., "Conference Center West Wing"). If scheduling for specific sub-locations, reference them in 'Additional Criteria'.</p>
              </div>
              <div>
                <Label htmlFor="eventType">Event Type (Optional)</Label>
                <Input id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g., Music Festival Day 1, Conference Keynotes" disabled={isSchedulerFormDisabled}/>
                <p className="text-xs text-muted-foreground mt-1">Optional. Providing a descriptive type (e.g., "Concert - Main Performances", "Wedding Reception Coverage") helps the AI understand typical activities and phases. Be specific for best results.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Personnel <span className="text-destructive">*</span></Label>
              {projectPersonnel.length > 0 && !isSchedulerFormDisabled ? (
                <ScrollArea className="h-48 w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {projectPersonnel.map((person) => (
                      <div key={person.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sched-person-${person.id}`}
                          checked={selectedPersonnelNames.includes(person.name)}
                          onCheckedChange={(checked) => handlePersonnelChange(person.name, !!checked)}
                        />
                        <Label htmlFor={`sched-person-${person.id}`} className="font-normal">
                          {person.name} <span className="text-xs text-muted-foreground">({person.role})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                 <div className="text-xs text-muted-foreground mt-1 p-4 border rounded-md min-h-[10rem] flex items-center justify-center bg-muted/50">
                    <p className="text-center">
                      {isSchedulerFormDisabled
                        ? (selectedProject ? "No personnel assigned to covered events for this project." : "Select a project to see available personnel.")
                        : (selectedProject ? "No personnel assigned to covered events in this project." : "Select a project.")
                      }
                    </p>
                  </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Personnel assigned to covered events in the selected project will be listed here. Select all relevant team members for this schedule.</p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="additionalCriteria">Additional Criteria & Specific Tasks (Optional)</Label>
              <Textarea
                id="additionalCriteria"
                value={additionalCriteria}
                onChange={(e) => setAdditionalCriteria(e.target.value)}
                placeholder="e.g., 'Alice needs a 1-hour break around 1pm', 'Focus on capturing opening act for Main Stage - Day 1', 'Bob is on setup crew from 8am-10am only', equipment constraints, VIP presence. Mention specific event names from the selected date if you want the AI to focus on them."
                rows={4}
                disabled={isSchedulerFormDisabled}
              />
                <p className="text-xs text-muted-foreground mt-1">List any must-have items, strict preferences, or specific tasks. The AI will prioritize these.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || isSchedulerFormDisabled || selectedPersonnelNames.length === 0 || !selectedDateString || eventType.trim() === "" }>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Schedule
            </Button>
          </CardFooter>
        </form>
      </Card>

      {scheduleOutput && !isSchedulerFormDisabled && (
        <Card className="shadow-lg" id="schedule-preview">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Formatted Schedule Preview</CardTitle>
              <CardDescription>
                For {selectedProject?.name || "Selected Project"}, {selectedDateString ? format(parseISO(selectedDateString), "PPP") : "the selected date"}
                {location.trim() ? ` at ${location.trim()}` : ""}
                {eventType.trim() ? `. Type: ${eventType}` : ""}
                . Personnel: {selectedPersonnelNames.join(", ") || "N/A"}.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleApplySchedule} variant="outline" disabled={isScheduleApplied || !parsedSchedule.length}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {isScheduleApplied ? "Schedule Applied (Context Updated)" : "Apply Schedule to Event Data"}
                </Button>
                <Button onClick={handlePrint} variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Export to PDF
                </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isScheduleApplied && (
                <Alert variant="default" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Assignments Applied to Event Context</AlertTitle>
                    <AlertDescription>
                        Personnel assignments based on this schedule have been updated in the shared EventContext.
                        These changes will be reflected on other pages like the Events page. Review the Events page to see the updated assignments.
                    </AlertDescription>
                </Alert>
            )}
            {parsedSchedule.length > 0 ? (
              parsedSchedule.map((person, pIndex) => (
                <Card key={`person-${pIndex}`} className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg">{person.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {person.items.length > 0 ? (
                      <ul className="space-y-2">
                        {person.items.map((item, iIndex) => {
                          const eventForTask = item.matchedEventId ? eventsForSelectedDate.find(e => e.id === item.matchedEventId) : null;
                          const shotsForEvent = eventForTask ? initialShotRequestsMockForScheduler.filter(sr => sr.eventId === eventForTask.id) : [];

                          return (
                            <li key={`item-${pIndex}-${iIndex}`} className="flex flex-col text-sm border-b border-border/50 pb-2 last:border-b-0">
                              <div className="flex">
                                <span className="font-semibold sm:w-40 shrink-0">{item.time}:</span>
                                <span className="sm:ml-2 flex-grow">{item.task}</span>
                              </div>
                              {eventForTask && shotsForEvent.length > 0 && (
                                <div className="mt-1.5 pl-4 sm:pl-[calc(10rem+0.5rem)] text-xs">
                                  <p className="font-medium text-muted-foreground flex items-center gap-1.5">
                                    <ListChecks className="h-3.5 w-3.5" />
                                    Shot Requests for "{eventForTask.name}":
                                  </p>
                                  <ul className="list-disc list-inside pl-2 mt-0.5 space-y-0.5">
                                    {shotsForEvent.map(shot => (
                                      <li key={shot.id} className="text-muted-foreground/80">{shot.description} ({shot.shotType}, Prio: {shot.priority})</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific tasks listed for {person.name}.</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">Could not parse the schedule into a structured format. Displaying raw output:</p>
            )}
            {parsedSchedule.length === 0 && scheduleOutput?.schedule && (
                 <pre className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap text-sm max-h-96 overflow-auto">
                    {scheduleOutput.schedule}
                </pre>
            )}

            <Alert variant="default" className="mt-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Exporting & Applying Schedule</AlertTitle>
              <AlertDescription>
                To export this schedule as a PDF, please use your browser's "Print" function (Ctrl/Cmd + P) and choose "Save as PDF" as the destination.
                The "Apply Schedule" button updates the shared EventContext with new personnel assignments based on the AI output. These changes will be reflected across the application.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
