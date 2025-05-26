
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarIcon as CalendarIconLucide, Eye, AlertTriangle, Users, ListChecks, Zap } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { format, parseISO, isValid, setHours, setMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { BlockScheduleView } from "@/components/block-schedule-view";

type PersonnelMinimal = {
  id: string;
  name: string;
  role: string;
};

const availablePersonnelList: PersonnelMinimal[] = [
  { id: "user001", name: "Alice Wonderland", role: "Lead Camera Op" },
  { id: "user002", name: "Bob The Builder", role: "Audio Engineer" },
  { id: "user003", name: "Charlie Chaplin", role: "Producer" },
  { id: "user004", name: "Diana Prince", role: "Drone Pilot" },
  { id: "user005", name: "Edward Scissorhands", role: "Grip" },
];

const eventSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  projectId: z.string().min(1, { message: "Please select a project." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD." }),
  time: z.string().regex(/^\d{2}:\d{2} - \d{2}:\d{2}$/, { message: "Time must be HH:MM - HH:MM." }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  assignedPersonnelIds: z.array(z.string()).optional(),
  isQuickTurnaround: z.boolean().optional(),
  deadline: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Deadline must be a valid date-time.",
  }),
});

type EventFormData = z.infer<typeof eventSchema>;

export type Event = EventFormData & {
  id: string;
  project?: string;
  deliverables: number;
  shotRequests: number;
  hasOverlap?: boolean;
};

const initialEventsMock: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 3, assignedPersonnelIds: ["user001", "user002"], isQuickTurnaround: true, deadline: "2024-07-16T10:00" },
    { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 1, assignedPersonnelIds: ["user003"], deadline: "2024-09-15T12:00" },
    { id: "evt003", name: "VIP Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false },
    { id: "evt004", name: "Artist Meet & Greet", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: ["user004"] },
    { id: "evt005", name: "Closing Ceremony", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 0, assignedPersonnelIds: ["user001", "user003", "user005"], isQuickTurnaround: true, deadline: "2024-09-17T23:59" },
];


export const parseEventTimes = (dateStr: string, timeStr: string): { start: Date; end: Date } | null => {
  const baseDate = parseISO(dateStr);
  if (!isValid(baseDate)) return null;

  const parts = timeStr.split(' - ');
  if (parts.length !== 2) return null;

  const [startTimeStr, endTimeStr] = parts;
  const [startHour, startMinute] = startTimeStr.split(':').map(Number);
  const [endHour, endMinute] = endTimeStr.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return null;

  let startDate = setHours(startOfDay(baseDate), startHour);
  startDate = setMinutes(startDate, startMinute);

  let endDate = setHours(startOfDay(baseDate), endHour);
  endDate = setMinutes(endDate, endMinute);

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

export function formatDeadline(deadlineString?: string): string | null {
  if (!deadlineString) return null;
  try {
    const date = parseISO(deadlineString);
    if (!isValid(date)) return "Invalid Date";
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch (e) {
    return "Invalid Date";
  }
}

export default function EventsPage() {
  const { selectedProject, projects: allProjects, isLoadingProjects } = useProjectContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [activeBlockScheduleDateKey, setActiveBlockScheduleDateKey] = useState<string | null>(null);

  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue,
    watch
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      isQuickTurnaround: false,
      deadline: "",
    }
  });

  useEffect(() => {
    if (!isLoadingSettings) {
        setEvents(useDemoData ? initialEventsMock : []);
    }
  }, [useDemoData, isLoadingSettings]);

  useEffect(() => {
    let defaultEventDate = new Date();
    if (activeBlockScheduleDateKey) {
      const parsedKeyDate = parseISO(activeBlockScheduleDateKey);
      if (isValid(parsedKeyDate)) {
        defaultEventDate = parsedKeyDate;
      }
    }

    if (editingEvent) {
      reset({
        name: editingEvent.name,
        projectId: editingEvent.projectId,
        date: editingEvent.date,
        time: editingEvent.time,
        priority: editingEvent.priority as EventFormData['priority'],
        assignedPersonnelIds: editingEvent.assignedPersonnelIds || [],
        isQuickTurnaround: editingEvent.isQuickTurnaround || false,
        deadline: editingEvent.deadline || "",
      });
    } else {
      reset({
        name: "",
        projectId: selectedProject?.id || (allProjects.length > 0 ? allProjects[0].id : ""),
        date: format(defaultEventDate, "yyyy-MM-dd"),
        time: "09:00 - 17:00",
        priority: "Medium",
        assignedPersonnelIds: [],
        isQuickTurnaround: false,
        deadline: "",
      });
    }
  }, [editingEvent, reset, isEventModalOpen, selectedProject, allProjects, activeBlockScheduleDateKey]);


  const filteredEvents = useMemo(() => {
    let currentEvents = events;
    if (selectedProject) {
      currentEvents = events.filter(event => event.projectId === selectedProject.id);
    }
    return currentEvents.map(event => {
      let hasOverlap = false;
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
    }, {} as Record<string, Event[]>);

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

  useEffect(() => {
    if (groupedAndSortedEvents.length > 0) {
      const firstDateKey = groupedAndSortedEvents[0][0];
      if (!activeBlockScheduleDateKey || !groupedAndSortedEvents.find(g => g[0] === activeBlockScheduleDateKey)) {
        setActiveBlockScheduleDateKey(firstDateKey);
      }
    } else {
      setActiveBlockScheduleDateKey(null);
    }
  }, [groupedAndSortedEvents, activeBlockScheduleDateKey]);


  const handleEventSubmit: SubmitHandler<EventFormData> = (data) => {
    const selectedProjInfo = allProjects.find(p => p.id === data.projectId);

    if (editingEvent) {
      setEvents(prevEvents => prevEvents.map(evt =>
        evt.id === editingEvent.id
        ? { ...editingEvent, ...data, project: selectedProjInfo?.name || editingEvent.project || "Unknown Project" }
        : evt
      ));
      toast({
        title: "Event Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    } else {
      const newEvent: Event = {
        ...data,
        id: `evt${String(events.length + initialEventsMock.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        project: selectedProjInfo?.name || "Unknown Project",
        deliverables: 0,
        shotRequests: 0,
        hasOverlap: false,
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
        variant: "destructive"
      });
      setEventToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
  };

  if (isLoadingSettings || isLoadingProjects) {
      return <div>Loading event data settings...</div>;
  }

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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update the details for this event." : "Fill in the details below to create a new event."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEventSubmit)} className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-4">
                {/* Event Details Fields */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-name" className="text-right col-span-1">Name</Label>
                  <div className="col-span-3">
                    <Input id="event-name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-projectId" className="text-right col-span-1">Project</Label>
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
                    <Label htmlFor="event-date" className="text-right col-span-1">Date</Label>
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
                                    defaultMonth={field.value ? parseISO(field.value) : (activeBlockScheduleDateKey ? parseISO(activeBlockScheduleDateKey) : new Date())}
                                />
                                </PopoverContent>
                            </Popover>
                            )}
                        />
                        {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-time" className="text-right col-span-1">Time</Label>
                  <div className="col-span-3">
                    <Input id="event-time" {...register("time")} placeholder="HH:MM - HH:MM" className={errors.time ? "border-destructive" : ""} />
                    {errors.time && <p className="text-xs text-destructive mt-1">{errors.time.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-priority" className="text-right col-span-1">Priority</Label>
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
                {/* Quick Turnaround and Deadline */}
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-deadline" className="text-right col-span-1">Deadline</Label>
                  <div className="col-span-3">
                    <Input
                      id="event-deadline"
                      type="datetime-local"
                      {...register("deadline")}
                      className={errors.deadline ? "border-destructive" : ""}
                    />
                    {errors.deadline && <p className="text-xs text-destructive mt-1">{errors.deadline.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-quickTurnaround" className="text-right col-span-1">Quick Turn</Label>
                  <div className="col-span-3 flex items-center">
                    <Controller
                        name="isQuickTurnaround"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                            id="event-quickTurnaround"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mr-2"
                            />
                        )}
                    />
                    <Label htmlFor="event-quickTurnaround" className="font-normal text-sm">Mark as high priority with a tight deadline.</Label>
                    {errors.isQuickTurnaround && <p className="text-xs text-destructive mt-1">{errors.isQuickTurnaround.message}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign Personnel</Label>
                <ScrollArea className="h-60 w-full rounded-md border p-4">
                  <Controller
                    name="assignedPersonnelIds"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <div className="space-y-2">
                        {availablePersonnelList.map((person) => (
                          <div key={person.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`person-${person.id}`}
                              checked={field.value?.includes(person.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), person.id])
                                  : field.onChange(
                                      (field.value || []).filter(
                                        (id) => id !== person.id
                                      )
                                    );
                              }}
                            />
                            <Label htmlFor={`person-${person.id}`} className="font-normal">
                              {person.name} <span className="text-xs text-muted-foreground">({person.role})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </ScrollArea>
                {errors.assignedPersonnelIds && <p className="text-xs text-destructive mt-1">{errors.assignedPersonnelIds.message}</p>}
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
                              <span className="flex items-center gap-1.5">
                                {event.isQuickTurnaround && <Zap className="h-5 w-5 text-red-500" titleAccess="Quick Turnaround"/>}
                                {event.name}
                              </span>
                              <Badge variant={
                                event.priority === "Critical" ? "destructive" :
                                event.priority === "High" ? "secondary" :
                                event.priority === "Medium" ? "outline" : "default"
                              }>{event.priority}</Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center">
                              {event.time}
                              {event.hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive" title="Potential Time Conflict" />}
                            </CardDescription>
                             {event.deadline && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                Deadline: {formatDeadline(event.deadline)}
                              </p>
                            )}
                          </CardHeader>
                          <CardContent className="flex-grow space-y-1">
                            {!selectedProject && event.project && (
                              <p className="text-xs text-muted-foreground">Project: {event.project}</p>
                            )}
                             {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center">
                                <Users className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                                Assigned: {event.assignedPersonnelIds.length}
                              </p>
                            )}
                            <Link href={`/events/${event.id}/shots`} className="text-xs text-accent hover:underline flex items-center">
                                <ListChecks className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                                Shot Requests: {event.shotRequests}
                            </Link>
                            <p className="text-xs text-muted-foreground">Deliverables: {event.deliverables}</p>
                          </CardContent>
                          <CardFooter className="border-t pt-3 flex flex-col sm:flex-row items-center gap-2">
                             <Button variant="outline" size="sm" asChild className="w-full sm:w-auto flex-1">
                                <Link href={`/events/${event.id}/shots`}>
                                  <Eye className="mr-2 h-4 w-4" /> Manage Shots
                                </Link>
                              </Button>
                               <Button variant="outline" size="sm" onClick={() => openEditEventModal(event)} className="w-full sm:w-auto flex-1">
                                <Edit className="mr-2 h-4 w-4" /> Edit Event
                              </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No events scheduled {selectedProject ? `for ${selectedProject.name}` : "that match your criteria"}. {useDemoData ? 'Toggle "Load Demo Data" in settings or add an event.' : 'Add an event to get started.'}
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
                      <TableHead>Deadline</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Shot Requests</TableHead>
                      <TableHead>Deliverables</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium flex items-center gap-1.5">
                           {event.isQuickTurnaround && <Zap className="h-4 w-4 text-red-500" titleAccess="Quick Turnaround"/>}
                          {event.name}
                        </TableCell>
                        {!selectedProject && <TableCell>{event.project}</TableCell>}
                        <TableCell className="flex items-center">
                          {format(parseISO(event.date), "PPP")} <span className="text-muted-foreground ml-1">({event.time})</span>
                          {event.hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive" title="Potential Time Conflict"/>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {event.deadline ? formatDeadline(event.deadline) : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            event.priority === "Critical" ? "destructive" :
                            event.priority === "High" ? "secondary" :
                            event.priority === "Medium" ? "outline" : "default"
                          }>{event.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {event.assignedPersonnelIds?.length || 0}
                        </TableCell>
                        <TableCell>
                           <Link href={`/events/${event.id}/shots`} className="text-accent hover:underline">
                            {event.shotRequests}
                          </Link>
                        </TableCell>
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
                  No events found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}. {useDemoData ? 'Toggle "Load Demo Data" in settings or add an event.' : 'Add an event to get started.'}
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
                View events for a selected day laid out on an hourly timeline. Select a day tab below to view its schedule.
                 {selectedProject ? ` (Filtered for ${selectedProject.name})` : " (Showing all projects)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedAndSortedEvents.length > 0 && activeBlockScheduleDateKey ? (
                <Tabs
                  value={activeBlockScheduleDateKey}
                  onValueChange={setActiveBlockScheduleDateKey}
                  className="w-full"
                >
                  <TabsList className="mb-4 overflow-x-auto whitespace-nowrap justify-start h-auto p-1">
                    {groupedAndSortedEvents.map(([dateKey, _]) => (
                      <TabsTrigger key={dateKey} value={dateKey} className="px-3 py-1.5">
                        {format(parseISO(dateKey), "EEE, MMM d")}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {groupedAndSortedEvents.map(([dateKey, dayEvents]) => (
                    <TabsContent key={`content-${dateKey}`} value={dateKey}>
                      <BlockScheduleView
                        selectedDate={parseISO(dateKey)}
                        eventsForDate={dayEvents}
                        onEditEvent={openEditEventModal}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="p-8 text-center text-muted-foreground rounded-md min-h-[400px] flex flex-col items-center justify-center bg-muted/20">
                  <CalendarIconLucide size={48} className="mb-4 text-muted" />
                  <p className="text-lg font-medium">
                    No events scheduled {selectedProject ? `for ${selectedProject.name}` : ""} to display in timeline.
                  </p>
                  <p>
                    {useDemoData ? 'Add some events for the selected project or adjust your project filter to see the timeline view.' : 'Add events to see the timeline view.'}
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
