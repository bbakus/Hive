
"use client";

import { useState, type FormEvent, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Wand2, Loader2, Printer, Info, UserCheck, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from "@/ai/flows/smart-schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { Event } from "@/app/(app)/events/page"; 

// Mock data - In a real app, this would come from a global store or API
// Duplicating relevant mock data for now to make scheduler page self-contained for filtering
const initialEventsMockForScheduler: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 20, assignedPersonnelIds: ["user001", "user002", "user006"] },
    { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 5, assignedPersonnelIds: ["user003", "user007"] },
    { id: "evt003", name: "VIP Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 3, assignedPersonnelIds: ["user003"] },
    { id: "evt004", name: "Artist Meet & Greet", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 10, assignedPersonnelIds: ["user004", "user006"] },
    { id: "evt005", name: "Closing Ceremony", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 8, assignedPersonnelIds: ["user001", "user003", "user005"] },
    { id: "evt006", name: "Workshop Alpha", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-16", time: "10:00 - 12:00", priority: "Medium", deliverables: 2, shotRequests: 5, assignedPersonnelIds: ["user001", "user005"]},
];

const allAvailablePersonnelMockForScheduler: { id: string; name: string; role: string }[] = [
  { id: "user001", name: "Alice Wonderland", role: "Lead Camera Op" },
  { id: "user002", name: "Bob The Builder", role: "Audio Engineer" },
  { id: "user003", name: "Charlie Chaplin", role: "Producer" },
  { id: "user004", name: "Diana Prince", role: "Drone Pilot" },
  { id: "user005", name: "Edward Scissorhands", role: "Grip" },
  { id: "user006", name: "Fiona Gallagher", role: "Coordinator" },
  { id: "user007", name: "George Jetson", role: "Tech Lead" },
];


interface ParsedScheduleItem {
  time: string;
  task: string;
}

interface ParsedSchedulePerson {
  name: string;
  items: ParsedScheduleItem[];
}

type ParsedSchedule = ParsedSchedulePerson[];

const parseScheduleString = (scheduleString: string): ParsedSchedule => {
  const parsed: ParsedSchedule = [];
  if (!scheduleString) return parsed;

  const lines = scheduleString.split('\n').filter(line => line.trim() !== '');
  let currentPerson: ParsedSchedulePerson | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const personMatch = trimmedLine.match(/^([\w\s]+):$/i);
    
    if (personMatch) {
      if (currentPerson) {
        if (currentPerson.items.length > 0) {
          parsed.push(currentPerson);
        }
      }
      currentPerson = { name: personMatch[1].trim(), items: [] };
    } else if (currentPerson) {
      const itemMatch = trimmedLine.match(/^(\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?)\s*:\s*(.+)/i);
      if (itemMatch) {
        currentPerson.items.push({ time: itemMatch[1].trim(), task: itemMatch[2].trim() });
      } else if (trimmedLine) { 
        if (!line.startsWith("  ") && !line.startsWith("\t")) { 
            if (currentPerson.items.length > 0) {
                const lastItem = currentPerson.items[currentPerson.items.length -1];
                if (!lastItem.task.includes(trimmedLine)) { 
                    lastItem.task += ` (${trimmedLine})`; 
                }
            } else {
                 currentPerson.items.push({ time: "General", task: trimmedLine });
            }
        }
      }
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

  const [selectedDateString, setSelectedDateString] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [selectedPersonnelNames, setSelectedPersonnelNames] = useState<string[]>([]);
  const [eventType, setEventType] = useState("Concert"); // Default, can be changed by user
  const [additionalCriteria, setAdditionalCriteria] = useState("Ensure regular breaks for all personnel. Prioritize main stage coverage.");
  
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOutput, setScheduleOutput] = useState<GenerateScheduleOutput | null>(null);
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule>([]);
  
  const [projectEventDates, setProjectEventDates] = useState<string[]>([]);
  const [projectPersonnel, setProjectPersonnel] = useState<{ id: string; name: string; role: string }[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (isLoadingSettings || !useDemoData) {
      setProjectEventDates([]);
      setProjectPersonnel([]);
      setSelectedDateString(undefined);
      setSelectedPersonnelNames([]);
      if (!useDemoData) setEventType(""); // Clear event type if demo data is off
      return;
    }

    if (selectedProjectId) {
      const eventsForProject = initialEventsMockForScheduler.filter(event => event.projectId === selectedProjectId);
      const uniqueDates = Array.from(new Set(eventsForProject.map(event => event.date))).sort();
      setProjectEventDates(uniqueDates);
      
      if (uniqueDates.length > 0) {
        // If current selectedDateString is not in new uniqueDates, or undefined, set to first uniqueDate
        if (!selectedDateString || !uniqueDates.includes(selectedDateString)) {
            setSelectedDateString(uniqueDates[0]);
        }
      } else {
        setSelectedDateString(undefined); // No dates for this project
      }

      const personnelIdsInProject = new Set<string>();
      eventsForProject.forEach(event => {
        event.assignedPersonnelIds?.forEach(id => personnelIdsInProject.add(id));
      });
      
      const filteredPersonnel = allAvailablePersonnelMockForScheduler.filter(p => personnelIdsInProject.has(p.id));
      setProjectPersonnel(filteredPersonnel);
      setSelectedPersonnelNames(prev => prev.filter(name => filteredPersonnel.some(p => p.name === name)));

    } else { // No project selected
      setProjectEventDates([]);
      setProjectPersonnel([]);
      setSelectedDateString(undefined);
      setSelectedPersonnelNames([]);
    }
  }, [selectedProjectId, useDemoData, isLoadingSettings, selectedDateString]); // added selectedDateString


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
    if (!eventType.trim()) {
      toast({ title: "Error", description: "Please specify an Event Type for context.", variant: "destructive" });
      return;
    }
    if (!selectedProject) {
        toast({ title: "Error", description: "Please select a project first.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setScheduleOutput(null);
    setParsedSchedule([]);

    const input: GenerateScheduleInput = {
      date: selectedDateString,
      location: location.trim() || undefined,
      personnel: selectedPersonnelNames,
      eventType,
      additionalCriteria,
    };

    try {
      const result = await generateSchedule(input);
      setScheduleOutput(result);
      if (result.schedule) {
        setParsedSchedule(parseScheduleString(result.schedule));
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

  const handlePrint = () => {
    window.print();
  };
  
  if (isLoadingSettings) {
    return <div>Loading scheduler settings...</div>;
  }

  const isSchedulerDisabled = !selectedProjectId || !useDemoData;


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-8 w-8 text-accent icon-glow" /> Smart Schedule Generator
        </h1>
        <p className="text-muted-foreground">
          {selectedProject ? `Generating schedule for ${selectedProject.name}. ` : "Select a project to begin. "}
           Dynamically generate per-day and per-person schedule views using AI.
        </p>
      </div>

      {isSchedulerDisabled && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scheduler Disabled</AlertTitle>
          <AlertDescription>
            {!useDemoData ? "Demo data is currently turned off. Please enable it in settings to use the scheduler with sample data." : "Please select a project from the main navigation to enable the scheduler."}
          </AlertDescription>
        </Alert>
      )}

      <Card className={cn("shadow-lg", isSchedulerDisabled && "opacity-50 pointer-events-none")}>
        <CardHeader>
          <CardTitle>Generate New Schedule</CardTitle>
          <CardDescription>
            Provide details to generate an optimized schedule. Date and Personnel are populated based on the selected project.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Select 
                  value={selectedDateString} 
                  onValueChange={setSelectedDateString}
                  disabled={projectEventDates.length === 0 || isSchedulerDisabled}
                >
                  <SelectTrigger id="date-select">
                    <SelectValue placeholder={projectEventDates.length > 0 ? "Select a date" : (selectedProject ? "No event dates for project" : "Select a project first")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projectEventDates.map(dateStr => (
                      <SelectItem key={dateStr} value={dateStr}>
                        {format(parseISO(dateStr), "PPP")} ({format(parseISO(dateStr), "eeee")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Dates are dynamically populated based on events scheduled for the selected project. Choose a relevant date.</p>
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Stage, Hall B" disabled={isSchedulerDisabled} />
                 <p className="text-xs text-muted-foreground mt-1">Specify a general event area if it has distinct scheduling implications (e.g., "Conference Center West Wing", "Outdoor Festival Area"). Detailed locations can be in 'Additional Criteria'.</p>
              </div>
              <div>
                <Label htmlFor="eventType">Event Type <span className="text-destructive">*</span></Label>
                <Input id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g., Concert, Conference, Photoshoot" disabled={isSchedulerDisabled}/>
                <p className="text-xs text-muted-foreground mt-1">Crucial for AI context. Be descriptive (e.g., "Music Festival Main Day", "Corporate Product Launch", "Wedding Ceremony & Reception"). This helps the AI understand typical phases and tasks.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Personnel <span className="text-destructive">*</span></Label>
              {projectPersonnel.length > 0 && !isSchedulerDisabled ? (
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
                 <div className="text-xs text-muted-foreground mt-1 p-4 border rounded-md min-h-24 flex items-center justify-center bg-muted/50">
                    <p className="text-center">
                      {isSchedulerDisabled ? (selectedProject ? "Enable demo data for personnel." : "Select a project to see personnel.") : "No personnel assigned to events in this project, or no personnel found."}
                    </p>
                  </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Personnel list is dynamically populated based on assignments in the selected project's events.</p>
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="additionalCriteria">Additional Criteria & Specific Tasks (Optional)</Label>
              <Textarea 
                id="additionalCriteria" 
                value={additionalCriteria} 
                onChange={(e) => setAdditionalCriteria(e.target.value)} 
                placeholder="e.g., 'Alice needs a 1-hour break around 1pm', 'Focus on capturing opening act', 'Bob is on setup crew from 8am-10am only', equipment constraints, VIP presence. Be specific for best results." 
                rows={4}
                disabled={isSchedulerDisabled}
              />
                <p className="text-xs text-muted-foreground mt-1">List any must-have items, strict preferences, or specific tasks that must be included. The AI will prioritize these.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || isSchedulerDisabled || selectedPersonnelNames.length === 0 || !selectedDateString || !eventType.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Schedule
            </Button>
          </CardFooter>
        </form>
      </Card>

      {scheduleOutput && !isSchedulerDisabled && (
        <Card className="shadow-lg" id="schedule-preview">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Formatted Schedule Preview</CardTitle>
              <CardDescription>
                For {selectedProject?.name || "Selected Project"}, {selectedDateString ? format(parseISO(selectedDateString), "PPP") : "the selected date"}
                {location.trim() ? ` at ${location.trim()}` : ""}.
                Event Type: {eventType}.
                Personnel: {selectedPersonnelNames.join(", ") || "N/A"}.
              </CardDescription>
            </div>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print / Export to PDF
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {parsedSchedule.length > 0 ? (
              parsedSchedule.map((person, pIndex) => (
                <Card key={`person-${pIndex}`} className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg">{person.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {person.items.length > 0 ? (
                      <ul className="space-y-2">
                        {person.items.map((item, iIndex) => (
                          <li key={`item-${pIndex}-${iIndex}`} className="flex flex-col sm:flex-row text-sm">
                            <span className="font-semibold sm:w-48 shrink-0">{item.time}:</span>
                            <span className="sm:ml-2">{item.task}</span>
                          </li>
                        ))}
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
            {parsedSchedule.length === 0 && scheduleOutput.schedule && (
                 <pre className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap text-sm max-h-96 overflow-auto">
                    {scheduleOutput.schedule}
                </pre>
            )}

            <Alert variant="default" className="mt-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Exporting Schedule</AlertTitle>
              <AlertDescription>
                To export this schedule as a PDF, please use your browser's "Print" function (Ctrl/Cmd + P) and choose "Save as PDF" as the destination.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    