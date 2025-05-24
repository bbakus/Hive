
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarIcon as CalendarIconLucide, Eye, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useProjectContext } from "@/contexts/ProjectContext";
import { format, parseISO, isValid, setHours, setMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { BlockScheduleView } from "@/components/block-schedule-view"; // Added import

const eventSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  projectId: z.string().min(1, { message: "Please select a project." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD." }),
  time: z.string().regex(/^\d{2}:\d{2} - \d{2}:\d{2}$/, { message: "Time must be HH:MM - HH:MM." }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
});

type EventFormData = z.infer<typeof eventSchema>;

export type Event = EventFormData & {
  id: string;
  project?: string; // Denormalized project name for display
  deliverables: number;
  shotRequests: number;
};

const initialEvents: Event[] = [
  { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 20 },
  { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", projectId: "proj002", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 5 },
  { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", projectId: "proj003", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 3 },
  { id: "evt004", name: "Artist Meet & Greet", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 10 },
  { id: "evt005", name: "Closing Ceremony", project: "Tech Conference X", projectId: "proj002", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 8 },
  { id: "evt006", name: "Sound Check", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "12:00 - 13:30", priority: "Medium", deliverables: 0, shotRequests: 2 },
  { id: "evt007", name: "Team Briefing AM", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "09:00 - 09:30", priority: "High", deliverables: 0, shotRequests: 1 },
  { id: "evt008", name: "Tech Rehearsal", project: "Tech Conference X", projectId: "proj002", date: "2024-09-14", time: "14:00 - 17:00", priority: "High", deliverables: 0, shotRequests: 3 },
];

// Helper function to parse time string "HH:MM - HH:MM" and date string "YYYY-MM-DD"
// This function should ideally be in a utils file if used in multiple places.
export const parseEventTimes = (dateStr: string, timeStr: string): { start: Date; end: Date } | null => {
  const baseDate = parseISO(dateStr);
  if (!isValid(baseDate)) return null;

  const parts = timeStr.split(' - ');
  if (parts.length !== 2) return null;

  const [startTimeStr, endTimeStr] = parts;
  const [startHour, startMinute] = startTimeStr.split(':').map(Number);
  const [endHour, endMinute] = endTimeStr.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return null;

  let startDate = setHours(startOfDay(baseDate), startHour); // Use startOfDay to avoid timezone issues with parseISO
  startDate = setMinutes(startDate, startMinute);

  let endDate = setHours(startOfDay(baseDate), endHour); // Use startOfDay
  endDate = setMinutes(endDate, endMinute);

  // Handle overnight events if end time is earlier than start time (e.g. 22:00 - 02:00)
  if (isBefore(endDate, startDate)) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return { start: startDate, end: endDate };
};

const checkOverlap = (eventA: Event, eventB: Event): boolean => {
  if (eventA.date !== eventB.date || eventA.id === eventB.id) return false;

  const timesA = parseEventTimes(eventA.date, eventA.time);
  const timesB = parseEventTimes(eventB.date, eventB.time);

  if (!timesA || !timesB) return false;

  return isBefore(timesA.start, timesB.end) && isAfter(timesA.end, timesB.start);
};


export default function EventsPage() {
  const { selectedProject, projects: allProjects } = useProjectContext();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [selectedBlockDate, setSelectedBlockDate] = useState<Date | undefined>(new Date());
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
      reset({
        name: "",
        projectId: selectedProject?.id || (allProjects.length > 0 ? allProjects[0].id : ""),
        date: format(selectedBlockDate || new Date(), "yyyy-MM-dd"), // Use selectedBlockDate if available
        time: "09:00 - 17:00",
        priority: "Medium",
      });
    }
  }, [editingEvent, reset, isEventModalOpen, selectedProject, allProjects, selectedBlockDate]);


  const filteredEvents = useMemo(() => {
    let currentEvents = events;
    if (selectedProject) {
      currentEvents = events.filter(event => event.projectId === selectedProject.id);
    }
    return currentEvents.map(event => {
      let hasOverlap = false;
      // Check overlap only against other events in the currently *filtered* list for the same project/view
      for (const otherEvent of currentEvents) { 
        if (event.id !== otherEvent.id && event.date === otherEvent.date) {
          if (checkOverlap(event, otherEvent)) {
            hasOverlap = true;
            break;
          }
        }
      }
      return { ...event, hasOverlap };
    }).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() || (parseEventTimes(a.date, a.time)?.start.getTime() || 0) - (parseEventTimes(b.date, b.time)?.start.getTime() || 0) );
  }, [selectedProject, events]);

  const groupedAndSortedEvents = useMemo(() => {
    const grouped = filteredEvents.reduce((acc, event) => {
      const date = event.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {} as Record<string, (Event & { hasOverlap?: boolean })[]>);

    Object.values(grouped).forEach(dayEvents => {
      dayEvents.sort((a, b) => {
        const timesA = parseEventTimes(a.date, a.time);
        const timesB = parseEventTimes(b.date, b.time);
        if (timesA && timesB) {
          return timesA.start.getTime() - timesB.start.getTime();
        }
        return 0;
      });
    });

    return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
  }, [filteredEvents]);

  const eventsForBlockSchedule = useMemo(() => {
    if (!selectedBlockDate) return [];
    const formattedDate = format(selectedBlockDate, "yyyy-MM-dd");
    return filteredEvents.filter(event => event.date === formattedDate);
  }, [selectedBlockDate, filteredEvents]);


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
        shotRequests: 0, // Initialize with 0, can be updated later
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
    // Reset logic is handled by useEffect
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    // Reset logic for form fields is handled by useEffect
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
        variant: "destructive"
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value || (selectedProject?.id || (allProjects.length > 0 ? allProjects[0].id : ""))}
                    >
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
                <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                              errors.date ? "border-destructive" : ""
                            )}
                          >
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
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
              This action cannot be undone. This will permanently delete the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>Delete Event</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="daily-overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily-overview">Daily Overview</TabsTrigger>
          <TabsTrigger value="event-list">Event List</TabsTrigger>
          <TabsTrigger value="block-schedule">Block Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-overview">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarIconLucide className="h-6 w-6 text-accent" /> Daily Schedule Overview</CardTitle>
              <CardDescription>
                Visualizes events grouped by day. Events with potential time conflicts are marked with <AlertTriangle className="inline h-4 w-4 text-destructive" />.
                {selectedProject ? ` (Filtered for ${selectedProject.name})` : " (Showing all projects)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedAndSortedEvents.length > 0 ? (
                groupedAndSortedEvents.map(([date, dayEvents]) => (
                  <div key={date}>
                    <h3 className="text-xl font-semibold mb-3 border-b pb-2">
                      {format(parseISO(date), "EEEE, MMMM do, yyyy")}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {dayEvents.map((event) => (
                        <Card key={event.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                              {event.name}
                              <Badge variant={
                                event.priority === "Critical" ? "destructive" :
                                event.priority === "High" ? "secondary" :
                                event.priority === "Medium" ? "outline" : "default"
                              }>{event.priority}</Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center">
                              {event.time}
                              {(event as any).hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive" title="Potential Time Conflict" />}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            {!selectedProject && event.project && (
                              <p className="text-xs text-muted-foreground">Project: {event.project}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Shot Requests: {event.shotRequests}</p>
                            <p className="text-xs text-muted-foreground">Deliverables: {event.deliverables}</p>
                          </CardContent>
                          <CardFooter className="border-t pt-3">
                             <Button variant="outline" size="sm" asChild className="w-full">
                                <Link href={`/events/${event.id}/shots`}>
                                  <Eye className="mr-2 h-4 w-4" /> View/Manage Shots
                                </Link>
                              </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No events scheduled {selectedProject ? `for ${selectedProject.name}` : "that match your criteria"}.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-list">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarIconLucide className="h-6 w-6 text-accent" /> Event List (Table View)</CardTitle>
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
                        <TableCell className="flex items-center">
                          {format(parseISO(event.date), "PPP")} <span className="text-muted-foreground ml-1">({event.time})</span>
                          {(event as any).hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive" title="Potential Time Conflict"/>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            event.priority === "Critical" ? "destructive" :
                            event.priority === "High" ? "secondary" :
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
        </TabsContent>

        <TabsContent value="block-schedule">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarIconLucide className="h-6 w-6 text-accent" /> Block Schedule (Timeline View)</CardTitle>
              <CardDescription>
                View events for a selected day laid out on an hourly timeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 border-b">
                <Label htmlFor="block-schedule-date" className="whitespace-nowrap">Select Date:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="block-schedule-date"
                      variant={"outline"}
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !selectedBlockDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIconLucide className="mr-2 h-4 w-4" />
                      {selectedBlockDate ? format(selectedBlockDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedBlockDate}
                      onSelect={setSelectedBlockDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {selectedBlockDate && eventsForBlockSchedule.length > 0 ? (
                <BlockScheduleView 
                  selectedDate={selectedBlockDate} 
                  eventsForDate={eventsForBlockSchedule} 
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground rounded-md min-h-[400px] flex flex-col items-center justify-center">
                  <CalendarIconLucide size={48} className="mb-4 text-muted" />
                  <p className="text-lg font-medium">
                    {selectedBlockDate ? "No events scheduled for this day." : "Please select a date to view the schedule."}
                  </p>
                  <p>
                    {selectedBlockDate ? "You can add events for " + format(selectedBlockDate, "MMMM do, yyyy") + " or choose another date." : ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    