
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
import { useEventContext, type Event, type ShotRequest } from "@/contexts/EventContext";
import { initialPersonnelMock, PHOTOGRAPHY_ROLES, type Personnel } from "@/app/(app)/personnel/page";


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

const parseScheduleString = (scheduleString: string, eventsForDay: Event[], getShotsFn: (eventId: string) => ShotRequest[]): ParsedSchedule => {
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
  const {
    eventsForSelectedProjectAndOrg,
    isLoadingEvents: isLoadingContextEvents,
    updateEvent,
    getShotRequestsForEvent,
  } = useEventContext();
  const { toast } = useToast();

  const [selectedDateString, setSelectedDateString] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [selectedPersonnelNames, setSelectedPersonnelNames] = useState<string[]>([]);
  const [eventType, setEventType] = useState("");
  const [additionalCriteria, setAdditionalCriteria] = useState("Ensure regular breaks for all personnel. Prioritize main assignments if applicable.");

  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOutput, setScheduleOutput] = useState<GenerateScheduleOutput | null>(null);
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule>([]);
  const [isScheduleApplied, setIsScheduleApplied] = useState(false);

  const [projectEventDates, setProjectEventDates] = useState<string[]>([]);
  const [projectPersonnel, setProjectPersonnel] = useState<Personnel[]>([]);
  const [currentProjectEvents, setCurrentProjectEvents] = useState<Event[]>([]);


  useEffect(() => {
    if (isLoadingSettings || isLoadingContextEvents || !selectedProjectId) {
      setCurrentProjectEvents([]);
      setProjectEventDates([]);
      setProjectPersonnel([]);
      setSelectedDateString(undefined);
      setSelectedPersonnelNames([]);
      setScheduleOutput(null);
      setParsedSchedule([]);
      setIsScheduleApplied(false);
      return;
    }
    
    const relevantEvents = (eventsForSelectedProjectAndOrg || []).filter(event => event.isCovered);
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
    
    const filteredPersonnel = initialPersonnelMock.filter(p => 
        personnelIdsInProjectEvents.has(p.id) && 
        PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role !== "Client"
    );
    setProjectPersonnel(filteredPersonnel);
    
    setSelectedPersonnelNames(prev => prev.filter(name => filteredPersonnel.some(p => p.name === name)));
    setScheduleOutput(null);
    setParsedSchedule([]);
    setIsScheduleApplied(false);

  }, [selectedProjectId, useDemoData, isLoadingSettings, eventsForSelectedProjectAndOrg, isLoadingContextEvents, selectedDateString]); // Added selectedDateString to re-evaluate personnel if date changes


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
      .filter(event => event.isCovered)
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
        setParsedSchedule(parseScheduleString(result.schedule, eventsForSelectedDate, getShotRequestsForEvent));
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
    if (!parsedSchedule.length || !currentProjectEvents.length || !selectedProject) {
        toast({ title: "No Schedule or Events", description: "Cannot apply schedule.", variant: "destructive" });
        return;
    }

    let assignmentsMadeCount = 0;
    const eventsToUpdate: Record<string, Set<string>> = {}; 

    parsedSchedule.forEach(personSchedule => {
        const personnelDetails = initialPersonnelMock.find(p => p.name === personSchedule.name);
        if (!personnelDetails) return;

        personSchedule.items.forEach(item => {
            if (item.matchedEventId) {
                if (!eventsToUpdate[item.matchedEventId]) {
                    eventsToUpdate[item.matchedEventId] = new Set();
                }
                eventsToUpdate[item.matchedEventId].add(personnelDetails.id);
            }
        });
    });
    
    let uniqueAssignmentsMade = 0;
    Object.keys(eventsToUpdate).forEach(eventId => {
        const eventToUpdate = eventsForSelectedProjectAndOrg.find(e => e.id === eventId);
        if (eventToUpdate) {
            const currentAssignments = new Set(eventToUpdate.assignedPersonnelIds || []);
            const newAssignmentsForThisEvent = eventsToUpdate[eventId];
            let madeChangeToThisEvent = false;

            newAssignmentsForThisEvent.forEach(personnelId => {
                if (!currentAssignments.has(personnelId)) {
                    currentAssignments.add(personnelId);
                    uniqueAssignmentsMade++;
                    madeChangeToThisEvent = true;
                }
            });
            
            if (madeChangeToThisEvent) {
                 updateEvent(eventId, { assignedPersonnelIds: Array.from(currentAssignments) });
            }
        }
    });
    
    setIsScheduleApplied(true);

    if (uniqueAssignmentsMade > 0) {
        toast({
            title: "Schedule Applied (Event Data Updated)",
            description: `${uniqueAssignmentsMade} new assignment(s) applied to shared Event data based on the AI schedule.`,
            duration: 7000,
        });
    } else {
        toast({
            title: "Schedule Reviewed (No New Assignments)",
            description: "No new personnel assignments were made to shared Event data based on the schedule.",
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

  const isSchedulerFormDisabled = !selectedProjectId || (!useDemoData && currentProjectEvents.length === 0 && !isLoadingContextEvents);


  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-8 w-8" /> Smart Schedule Generator 
        </p>
        <p className="text-muted-foreground">
          {selectedProject ? `Generating schedule for ${selectedProject.name}. ` : "Select a project to begin. "}
           Dynamically generate per-day and per-person schedule views using AI for events marked as "Covered".
        </p>
      </div>

      {isSchedulerFormDisabled && !isLoadingContextEvents && (
        <Alert variant="default" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scheduler Disabled or No Covered Events</AlertTitle>
          <AlertDescription>
            {!selectedProject && "Please select a project from the main navigation to enable the scheduler."}
            {selectedProject && !useDemoData && currentProjectEvents.length === 0 && "The selected project has no events marked for production coverage, or demo data is off. Please mark events as 'covered' on the Events page or enable demo data."}
            {selectedProject && useDemoData && currentProjectEvents.length === 0 && "The selected project has no events marked for production coverage."}
          </AlertDescription>
        </Alert>
      )}

      <Card className={cn(isSchedulerFormDisabled && "opacity-50 pointer-events-none")}>
        <CardHeader>
          <p className="text-lg font-semibold">Generate New Schedule</p> 
          <div className="text-sm text-muted-foreground"> 
            Provide details to generate an optimized schedule for covered events. Date and Personnel are dynamically populated based on the selected project's covered events.
          </div>
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
                    {projectEventDates.length === 0 && selectedProject && <p className="p-2 text-xs text-muted-foreground text-center">No covered event dates found for {selectedProject.name}.</p>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Select a date that has covered events scheduled for the current project.</p>
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Stage, Hall B" disabled={isSchedulerFormDisabled} />
                 <p className="text-xs text-muted-foreground mt-1">Optional. Specify a general event area (e.g., "Conference Center West Wing"). For specific sub-locations or venue details, refer to event names or add to 'Additional Criteria'.</p>
              </div>
              <div>
                <Label htmlFor="eventType">Event Type (Optional)</Label>
                <Input id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g., Music Festival Main Day, Corporate Headshots" disabled={isSchedulerFormDisabled}/>
                <p className="text-xs text-muted-foreground mt-1">Optional. Describe the type of event (e.g., "Full Day Conference Coverage", "Product Launch Photography") to help the AI understand typical activities and phases. If left blank, the AI will generate a general schedule based on listed events for the day.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Personnel <span className="text-destructive">*</span></Label>
              {projectPersonnel.length > 0 && !isSchedulerFormDisabled ? (
                <ScrollArea className="h-48 w-full rounded-none border p-4">
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
                 <div className="text-xs text-muted-foreground mt-1 p-4 border rounded-none min-h-[10rem] flex items-center justify-center bg-muted/50">
                    <p className="text-center">
                      {isSchedulerFormDisabled
                        ? (selectedProject ? "No personnel assigned to covered events for this project." : "Select a project to see available personnel.")
                        : (selectedProject && currentProjectEvents.length > 0 ? `No 'Photographer', 'Editor', or 'Project Manager' assigned to covered events in ${selectedProject.name}.` : (selectedProject ? `No covered events for ${selectedProject.name}.` : "Select a project."))
                      }
                    </p>
                  </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Only Photographers, Editors, and Project Managers assigned to covered events in the selected project will be listed here.</p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="additionalCriteria">Additional Criteria & Specific Tasks (Optional)</Label>
              <Textarea
                id="additionalCriteria"
                value={additionalCriteria}
                onChange={(e) => setAdditionalCriteria(e.target.value)}
                placeholder="e.g., 'Alice needs a 1-hour break around 1pm', 'Focus on opening ceremony shots for [Event Name for Today]', 'Bob is on setup from 8am-10am only'. Mention specific event names from the selected date if you want the AI to focus on them."
                rows={4}
                disabled={isSchedulerFormDisabled}
              />
                <p className="text-xs text-muted-foreground mt-1">List any must-have items, strict preferences, or specific tasks. The AI will prioritize these.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || isSchedulerFormDisabled || selectedPersonnelNames.length === 0 || !selectedDateString }>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Schedule
            </Button>
          </CardFooter>
        </form>
      </Card>

      {scheduleOutput && !isSchedulerFormDisabled && (
        <Card id="schedule-preview">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-lg font-semibold">Formatted Schedule Preview</p> 
              <div className="text-sm text-muted-foreground"> 
                For {selectedProject?.name || "Selected Project"}, {selectedDateString ? format(parseISO(selectedDateString), "PPP") : "the selected date"}
                {location.trim() ? ` at ${location.trim()}` : ""}
                {eventType.trim() ? `. Type: ${eventType.trim()}` : ""}
                . Personnel: {selectedPersonnelNames.join(", ") || "N/A"}.
              </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleApplySchedule} variant="outline" disabled={isScheduleApplied || !parsedSchedule.length}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {isScheduleApplied ? "Schedule Applied (Event Data Updated)" : "Apply Schedule to Event Data"}
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
                    <AlertTitle>Assignments Reflected in Shared Event Data</AlertTitle>
                    <AlertDescription>
                        Personnel assignments based on this schedule have been applied to the shared Event data.
                        These changes should reflect on other pages like the Events page.
                        (Note: This is a client-side update; no backend persistence is implemented.)
                    </AlertDescription>
                </Alert>
            )}
            {parsedSchedule.length > 0 ? (
              parsedSchedule.map((person, pIndex) => (
                <Card key={`person-${pIndex}`} className="bg-muted/30">
                  <CardHeader>
                    <p className="text-base font-medium">{person.name}</p> 
                  </CardHeader>
                  <CardContent>
                    {person.items.length > 0 ? (
                      <ul className="space-y-2">
                        {person.items.map((item, iIndex) => {
                          const eventForTask = item.matchedEventId ? eventsForSelectedDate.find(e => e.id === item.matchedEventId) : null;
                          const shotsForTaskEvent = eventForTask ? getShotRequestsForEvent(eventForTask.id) : [];

                          return (
                            <li key={`item-${pIndex}-${iIndex}`} className="flex flex-col text-sm border-b border-border/50 pb-2 last:border-b-0">
                              <div className="flex">
                                <span className="font-semibold sm:w-40 shrink-0">{item.time}:</span>
                                <span className="sm:ml-2 flex-grow">{item.task}</span>
                              </div>
                              {eventForTask && shotsForTaskEvent.length > 0 && (
                                <div className="mt-1.5 pl-4 sm:pl-[calc(10rem+0.5rem)] text-xs">
                                  <p className="font-medium text-muted-foreground flex items-center gap-1.5">
                                    <ListChecks className="h-3.5 w-3.5" />
                                    Shot Requests for "{eventForTask.name}":
                                  </p>
                                  <ul className="list-disc list-inside pl-2 mt-0.5 space-y-0.5">
                                    {shotsForTaskEvent.map(shot => (
                                      <li key={shot.id} className="text-muted-foreground/80">{shot.description} (Prio: {shot.priority})</li>
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
                 <pre className="p-4 bg-muted/50 rounded-none whitespace-pre-wrap text-sm max-h-96 overflow-auto">
                    {scheduleOutput.schedule}
                </pre>
            )}

            <Alert variant="default" className="mt-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Exporting & Applying Schedule</AlertTitle>
              <AlertDescription>
                To export this schedule as a PDF, please use your browser's "Print" function (Ctrl/Cmd + P) and choose "Save as PDF" as the destination.
                The "Apply Schedule" button updates personnel assignments for events in the shared Event data based on the AI-generated schedule. This is a client-side update.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
