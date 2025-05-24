
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Cpu, Wand2, Loader2, Printer, Info, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from "@/ai/flows/smart-schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedScheduleItem {
  time: string;
  task: string;
}

interface ParsedSchedulePerson {
  name: string;
  items: ParsedScheduleItem[];
}

type ParsedSchedule = ParsedSchedulePerson[];

// Mock available personnel (ideally from context or API in a real app)
// This list should align with personnel available for assignment on events page.
const allAvailablePersonnel: { id: string; name: string; role: string }[] = [
  { id: "user001", name: "Alice Wonderland", role: "Lead Camera Op" },
  { id: "user002", name: "Bob The Builder", role: "Audio Engineer" },
  { id: "user003", name: "Charlie Chaplin", role: "Producer" },
  { id: "user004", name: "Diana Prince", role: "Drone Pilot" },
  { id: "user005", name: "Edward Scissorhands", role: "Grip" },
  { id: "user006", name: "Fiona Gallagher", role: "Coordinator" },
  { id: "user007", name: "George Jetson", role: "Tech Lead" },
];


// Helper function to parse the schedule string
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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [location, setLocation] = useState("");
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [eventType, setEventType] = useState("Concert");
  const [additionalCriteria, setAdditionalCriteria] = useState("Ensure regular breaks for all personnel. Prioritize main stage coverage.");
  
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOutput, setScheduleOutput] = useState<GenerateScheduleOutput | null>(null);
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule>([]);
  const { toast } = useToast();

  const handlePersonnelChange = (personnelName: string, checked: boolean) => {
    setSelectedPersonnel(prev =>
      checked ? [...prev, personnelName] : prev.filter(name => name !== personnelName)
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Error", description: "Please select a date.", variant: "destructive" });
      return;
    }
    if (selectedPersonnel.length === 0) {
      toast({ title: "Error", description: "Please select at least one personnel member.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setScheduleOutput(null);
    setParsedSchedule([]);

    const input: GenerateScheduleInput = {
      date: format(date, "yyyy-MM-dd"),
      location: location.trim() || undefined,
      personnel: selectedPersonnel,
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-8 w-8 text-accent icon-glow" /> Smart Schedule Generator
        </h1>
        <p className="text-muted-foreground">Dynamically generate per-day and per-person schedule views using AI.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Generate New Schedule</CardTitle>
          <CardDescription>Provide details to generate an optimized schedule. Core inputs are Date, Personnel, and Event Type.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Column 1: Date, Location, Event Type */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">Select a date that has events scheduled for the most relevant schedule generation.</p>
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Stage, Hall B" />
                 <p className="text-xs text-muted-foreground mt-1">Specify if the location has unique scheduling implications. For specific sub-locations, consider detailing them in 'Additional Criteria'.</p>
              </div>
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Input id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g., Conference, Wedding, Music Festival" />
                <p className="text-xs text-muted-foreground mt-1">Helps AI understand typical phases and tasks for this type of event.</p>
              </div>
            </div>

            {/* Column 2: Personnel Selection */}
            <div className="space-y-2">
              <Label>Select Personnel</Label>
              <ScrollArea className="h-48 w-full rounded-md border p-4">
                <div className="space-y-2">
                  {allAvailablePersonnel.map((person) => (
                    <div key={person.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`person-${person.id}`}
                        checked={selectedPersonnel.includes(person.name)}
                        onCheckedChange={(checked) => handlePersonnelChange(person.name, !!checked)}
                      />
                      <Label htmlFor={`person-${person.id}`} className="font-normal">
                        {person.name} <span className="text-xs text-muted-foreground">({person.role})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">Choose personnel relevant to the event(s) on the selected date.</p>
            </div>
            
            {/* Additional Criteria - Spans both columns if needed or stays in its flow */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="additionalCriteria">Additional Criteria & Specific Tasks (Optional)</Label>
              <Textarea 
                id="additionalCriteria" 
                value={additionalCriteria} 
                onChange={(e) => setAdditionalCriteria(e.target.value)} 
                placeholder="e.g., Specific break times, 'Alice to cover opening ceremony', equipment constraints, VIP presence" 
                rows={4}
              />
                <p className="text-xs text-muted-foreground mt-1">List any must-have items or strict preferences. This is crucial for tailoring the schedule.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Schedule
            </Button>
          </CardFooter>
        </form>
      </Card>

      {scheduleOutput && (
        <Card className="shadow-lg" id="schedule-preview">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Formatted Schedule Preview</CardTitle>
              <CardDescription>
                For {date ? format(date, "PPP") : "the selected date"}
                {location ? ` at ${location}` : ""}.
                Event Type: {eventType}.
                Personnel: {selectedPersonnel.join(", ") || "N/A"}.
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
    