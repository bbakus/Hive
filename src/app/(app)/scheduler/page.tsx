"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Cpu, Wand2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from "@/ai/flows/smart-schedule-generator";
import { useToast } from "@/hooks/use-toast";

export default function SchedulerPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [location, setLocation] = useState("Event Venue A");
  const [personnel, setPersonnel] = useState("Alice, Bob, Charlie");
  const [eventType, setEventType] = useState("Concert");
  const [additionalCriteria, setAdditionalCriteria] = useState("Ensure regular breaks for all personnel. Prioritize main stage coverage.");
  
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOutput, setScheduleOutput] = useState<GenerateScheduleOutput | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!date) {
      toast({ title: "Error", description: "Please select a date.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setScheduleOutput(null);

    const input: GenerateScheduleInput = {
      date: format(date, "yyyy-MM-dd"),
      location,
      personnel: personnel.split(",").map(p => p.trim()).filter(p => p),
      eventType,
      additionalCriteria,
    };

    try {
      const result = await generateSchedule(input);
      setScheduleOutput(result);
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
          <CardDescription>Provide details to generate an optimized schedule.</CardDescription>
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
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Stage, Conference Hall B" />
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
              </div>
              <div>
                <Label htmlFor="additionalCriteria">Additional Criteria</Label>
                <Textarea 
                  id="additionalCriteria" 
                  value={additionalCriteria} 
                  onChange={(e) => setAdditionalCriteria(e.target.value)} 
                  placeholder="e.g., Specific break times, equipment constraints, VIP presence" 
                  rows={5}
                />
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Generated Schedule</CardTitle>
            <CardDescription>
              For {scheduleOutput.schedule ? format(date!, "PPP") : "the selected date"} at {location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap text-sm max-h-96 overflow-auto">
              {scheduleOutput.schedule}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
