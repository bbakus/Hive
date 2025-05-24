
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarIcon, Eye } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
});

type EventFormData = z.infer<typeof eventSchema>;

export type Event = EventFormData & {
  id: string;
  project?: string; // Denormalized project name for display
  deliverables: number; 
  shotRequests: number; 
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
  const { selectedProject, projects: allProjects } = useProjectContext(); 
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
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

  useEffect(() => {
    if (editingEvent) {
      reset({
        name: editingEvent.name,
        projectId: editingEvent.projectId,
        date: editingEvent.date,
        time: editingEvent.time,
        priority: editingEvent.priority as EventFormData['priority'],
      });
    } else {
      reset({ // Reset to default values for adding new event
        name: "",
        projectId: selectedProject?.id || "", // Pre-select current project if available
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00 - 17:00",
        priority: "Medium",
      });
    }
  }, [editingEvent, reset, isEventModalOpen, selectedProject]);


  const filteredEvents = useMemo(() => {
    if (!selectedProject) {
      return events; 
    }
    return events.filter(event => event.projectId === selectedProject.id);
  }, [selectedProject, events]);

  const handleEventSubmit: SubmitHandler<EventFormData> = (data) => {
    const selectedProjInfo = allProjects.find(p => p.id === data.projectId);

    if (editingEvent) {
      setEvents(prevEvents => prevEvents.map(evt => 
        evt.id === editingEvent.id 
        ? { ...evt, ...data, project: selectedProjInfo?.name || "Unknown Project" } 
        : evt
      ));
      toast({
        title: "Event Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    } else {
      const newEvent: Event = {
        ...data,
        id: `evt${String(events.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        project: selectedProjInfo?.name || "Unknown Project",
        deliverables: 0, 
        shotRequests: 0, 
      };
      setEvents((prevEvents) => [...prevEvents, newEvent]);
      toast({
        title: "Event Added",
        description: `"${data.name}" has been successfully added.`,
      });
    }
    closeEventModal();
  };
  
  const openAddEventModal = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDeleteId(eventId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDeleteId) {
      const event = events.find(e => e.id === eventToDeleteId);
      setEvents(prevEvents => prevEvents.filter(e => e.id !== eventToDeleteId));
      toast({
        title: "Event Deleted",
        description: `Event "${event?.name}" has been deleted.`,
      });
      setEventToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
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
        <Button onClick={openAddEventModal}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Event
        </Button>
      </div>

      <Dialog open={isEventModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeEventModal(); else setIsEventModalOpen(true);
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update the details for this event." : "Fill in the details below to create a new event."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEventSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-name" className="text-right">Name</Label>
              <div className="col-span-3">
                <Input id="event-name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-projectId" className="text-right">Project</Label>
              <div className="col-span-3">
                <Controller
                  name="projectId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
              <Label htmlFor="event-date" className="text-right">Date</Label>
              <div className="col-span-3">
                <Input id="event-date" type="date" {...register("date")} className={errors.date ? "border-destructive" : ""} />
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-time" className="text-right">Time</Label>
              <div className="col-span-3">
                <Input id="event-time" {...register("time")} placeholder="HH:MM - HH:MM" className={errors.time ? "border-destructive" : ""} />
                {errors.time && <p className="text-xs text-destructive mt-1">{errors.time.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-priority" className="text-right">Priority</Label>
              <div className="col-span-3">
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                <Button type="button" variant="outline" onClick={closeEventModal}>Cancel</Button>
              </DialogClose>
              <Button type="submit">{editingEvent ? "Save Changes" : "Add Event"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event
              and all its associated data (like shot requests, if implemented).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>Delete Event</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-6 w-6 text-accent" /> Event List</CardTitle>
          <CardDescription>
            {selectedProject ? `Events scheduled for ${selectedProject.name}.` : "Overview of all scheduled events and their details."}
            ({filteredEvents.length} events)
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
                        event.priority === "Critical" ? "destructive" :
                        event.priority === "High" ? "secondary" : // Adjusted for more visual distinction
                        event.priority === "Medium" ? "outline" : "default"
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
                      <Button variant="ghost" size="icon" className="hover:text-accent" onClick={() => openEditEventModal(event)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Event</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteClick(event.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Event</span>
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

    