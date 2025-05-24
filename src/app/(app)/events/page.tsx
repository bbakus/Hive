
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarIcon, ListChecks, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type Project } from "@/contexts/ProjectContext";
import { format } from "date-fns";

const eventSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  projectId: z.string().min(1, { message: "Please select a project." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD." }),
  time: z.string().regex(/^\d{2}:\d{2} - \d{2}:\d{2}$/, { message: "Time must be HH:MM - HH:MM." }), // Basic time range validation
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  // Optional fields, if needed later
  // deliverables: z.number().optional(),
  // shotRequests: z.number().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export type Event = EventFormData & {
  id: string;
  project?: string; // Denormalized project name for display
  deliverables: number; // Keep mock structure for now
  shotRequests: number; // Keep mock structure for now
};

// Initial Mock data - will be managed by state now
const initialEvents: Event[] = [
  { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 20 },
  { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", projectId: "proj002", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 5 },
  { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", projectId: "proj003", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 3 },
  { id: "evt004", name: "Artist Meet & Greet", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 10 },
  { id: "evt005", name: "Closing Ceremony", project: "Tech Conference X", projectId: "proj002", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 8 },
];

export default function EventsPage() {
  const { selectedProject, projects: allProjects } = useProjectContext(); // Get all projects for the dropdown
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      projectId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00 - 17:00",
      priority: "Medium",
    },
  });

  const filteredEvents = useMemo(() => {
    if (!selectedProject) {
      return events; // Show all events if no project is selected
    }
    // Filter events by projectId if a project is selected
    return events.filter(event => event.projectId === selectedProject.id);
  }, [selectedProject, events]);

  const handleAddEventSubmit: SubmitHandler<EventFormData> = (data) => {
    const selectedProj = allProjects.find(p => p.id === data.projectId);
    const newEvent: Event = {
      ...data,
      id: `evt${String(events.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      project: selectedProj?.name || "Unknown Project", // Store project name for display
      deliverables: 0, // Default value for new events
      shotRequests: 0, // Default value for new events
    };
    setEvents((prevEvents) => [...prevEvents, newEvent]);
    toast({
      title: "Event Added",
      description: `"${data.name}" has been successfully added.`,
    });
    reset();
    setIsAddEventDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events & Shot Requests</h1>
          <p className="text-muted-foreground">
            {selectedProject ? `Events for ${selectedProject.name}` : "Manage all events, shot requests, timings, and priorities."}
          </p>
        </div>
        <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new event.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddEventSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <div className="col-span-3">
                  <Input id="name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectId" className="text-right">Project</Label>
                <div className="col-span-3">
                  <Controller
                    name="projectId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className={errors.projectId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProjects.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.projectId && <p className="text-xs text-destructive mt-1">{errors.projectId.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Date</Label>
                <div className="col-span-3">
                  <Input id="date" type="date" {...register("date")} className={errors.date ? "border-destructive" : ""} />
                  {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">Time</Label>
                <div className="col-span-3">
                  <Input id="time" {...register("time")} placeholder="HH:MM - HH:MM" className={errors.time ? "border-destructive" : ""} />
                  {errors.time && <p className="text-xs text-destructive mt-1">{errors.time.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">Priority</Label>
                <div className="col-span-3">
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className={errors.priority ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.priority && <p className="text-xs text-destructive mt-1">{errors.priority.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Event</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-6 w-6 text-accent" /> Event List</CardTitle>
          <CardDescription>
            {selectedProject ? `Events scheduled for ${selectedProject.name}.` : "Overview of all scheduled events and their details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  {!selectedProject && <TableHead>Project</TableHead>}
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Shot Requests</TableHead>
                  <TableHead>Deliverables</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    {!selectedProject && <TableCell>{event.project}</TableCell>}
                    <TableCell>{event.date} <span className="text-muted-foreground">({event.time})</span></TableCell>
                    <TableCell>
                      <Badge variant={
                        event.priority === "High" ? "destructive" :
                        event.priority === "Critical" ? "destructive" : 
                        event.priority === "Medium" ? "secondary" : "outline"
                      }>{event.priority}</Badge>
                    </TableCell>
                    <TableCell>{event.shotRequests}</TableCell>
                    <TableCell>{event.deliverables}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent" asChild>
                        <Link href={`/events/${event.id}/shots`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View/Manage Shots</span>
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" disabled>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No events found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}.
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Shot Request Manager / Calendar View</CardTitle>
          <CardDescription>Detailed view for managing shot requests or a calendar interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A table UI or Calendar UI will allow management of events linked to specific projects, each including shot requests, timing details, priority levels and deliverables. (Coming Soon)</p>
          <img src="https://placehold.co/600x400.png" alt="Calendar View Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="calendar schedule task" />
        </CardContent>
      </Card>
    </div>
  );
}
