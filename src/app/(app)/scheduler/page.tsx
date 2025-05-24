
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Cpu, Wand2, Loader2, Printer, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from "@/ai/flows/smart-schedule-generator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ParsedScheduleItem {
  time: string;
  task: string;
}

interface ParsedSchedulePerson {
  name: string;
  items: ParsedScheduleItem[];
}

type ParsedSchedule = ParsedSchedulePerson[];

// Helper function to parse the schedule string
const parseScheduleString = (scheduleString: string): ParsedSchedule => {
  const parsed: ParsedSchedule = [];
  if (!scheduleString) return parsed;

  const lines = scheduleString.split('\n').filter(line => line.trim() !== '');
  let currentPerson: ParsedSchedulePerson | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Check if the line looks like a person's name (ends with a colon or is followed by indented lines)
    // This regex tries to capture names like "Personnel:" or "Alice:"
    const personMatch = trimmedLine.match(/^([\w\s]+):$/i);
    
    if (personMatch) {
      if (currentPerson) {
        // Before starting a new person, push the old one if they have items
        if (currentPerson.items.length > 0) {
          parsed.push(currentPerson);
        }
      }
      currentPerson = { name: personMatch[1].trim(), items: [] };
    } else if (currentPerson) {
      // This regex looks for a time pattern like "HH:MM - HH:MM:" or "HH:MM:" followed by a task
      const itemMatch = trimmedLine.match(/^(\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?)\s*:\s*(.+)/i);
      if (itemMatch) {
        currentPerson.items.push({ time: itemMatch[1].trim(), task: itemMatch[2].trim() });
      } else if (trimmedLine) { 
        // If it doesn't match the time pattern but there's text, add as a general task for the current person
        // This handles cases where tasks might not have a strict time prefix
        // To avoid adding sub-items of tasks, check indentation or add a simple heuristic
        if (!line.startsWith("  ") && !line.startsWith("\t")) { // Basic check for non-indented lines
            if (currentPerson.items.length > 0) {
                 // Append to the last task if it seems like a continuation
                const lastItem = currentPerson.items[currentPerson.items.length -1];
                if (!lastItem.task.includes(trimmedLine)) { // Avoid duplicates
                    lastItem.task += ` (${trimmedLine})`; 
                }
            } else {
                 currentPerson.items.push({ time: "General", task: trimmedLine });
            }
        }
      }
    } else if (trimmedLine && !parsed.length && !currentPerson) {
        // Handle case where the schedule might start with tasks without a person explicitly named first
        // Or if the first line is a general title that isn't a person.
        // For now, we'll create a "General Schedule" person for these.
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
  
  // If parsing fails to produce distinct persons, return the whole string under a general title
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
  const [location, setLocation] = useState(""); // Default to empty as it's optional
  const [personnel, setPersonnel] = useState("Alice, Bob, Charlie");
  const [eventType, setEventType] = useState("Concert");
  const [additionalCriteria, setAdditionalCriteria] = useState("Ensure regular breaks for all personnel. Prioritize main stage coverage.");
  
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOutput, setScheduleOutput] = useState<GenerateScheduleOutput | null>(null);
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule>([]);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Error", description: "Please select a date.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setScheduleOutput(null);
    setParsedSchedule([]);

    const input: GenerateScheduleInput = {
      date: format(date, "yyyy-MM-dd"),
      location: location.trim() || undefined, // Send undefined if empty
      personnel: personnel.split(",").map(p => p.trim()).filter(p => p),
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
          <Cpu className="h-8 w-8 text-accent icon-glow" /> Smart Schedule Renderer
        </h1>
        <p className="text-muted-foreground">Dynamically generate per-day and per-person schedule views using AI.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Generate New Schedule</CardTitle>
          <CardDescription>Provide details to generate an optimized schedule. Core inputs are Date, Personnel, and Event Type.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid md:grid-cols-2 gap-6">
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
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Stage, Hall B (if relevant)" />
                 <p className="text-xs text-muted-foreground mt-1">Specify if the location has unique scheduling implications.</p>
              </div>
              <div>
                <Label htmlFor="personnel">Personnel (comma-separated)</Label>
                <Input id="personnel" value={personnel} onChange={(e) => setPersonnel(e.target.value)} placeholder="e.g., John Doe, Jane Smith" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Input id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g., Conference, Wedding, Music Festival" />
                <p className="text-xs text-muted-foreground mt-1">Helps AI understand typical phases and tasks.</p>
              </div>
              <div>
                <Label htmlFor="additionalCriteria">Additional Criteria & Specific Tasks (Optional)</Label>
                <Textarea 
                  id="additionalCriteria" 
                  value={additionalCriteria} 
                  onChange={(e) => setAdditionalCriteria(e.target.value)} 
                  placeholder="e.g., Specific break times, 'Alice to cover opening ceremony', equipment constraints, VIP presence" 
                  rows={5}
                />
                 <p className="text-xs text-muted-foreground mt-1">List any must-have items or strict preferences.</p>
              </div>
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

