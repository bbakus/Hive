
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarIcon as CalendarIconLucide, Eye, AlertTriangle, Users, ListChecks, Zap, Filter, Camera, Focus, Video } from "lucide-react"; 
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
import { useProjectContext, type Project } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { format, parseISO, isValid, setHours, setMinutes, isAfter, isBefore, startOfDay, endOfDay, isWithinInterval, isSameDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { BlockScheduleView } from "@/components/block-schedule-view";
import { useEventContext } from "@/contexts/EventContext";
import { initialPersonnelMock, type Personnel, PHOTOGRAPHY_ROLES } from "@/app/(app)/personnel/page";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { DateRange } from "react-day-picker";


export const eventSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  projectId: z.string().min(1, { message: "Please select a project." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD." }),
  time: z.string().regex(/^\d{2}:\d{2} - \d{2}:\d{2}$/, { message: "Time must be HH:MM - HH:MM." }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  assignedPersonnelIds: z.array(z.string()).optional(),
  isQuickTurnaround: z.boolean().optional(),
  deadline: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)) || val === "", {
    message: "Deadline must be a valid date-time string or empty.",
  }),
  organizationId: z.string().optional(),
  discipline: z.enum(["Photography", ""] ).optional(), 
  isCovered: z.boolean().optional(),
  personnelActivity: z.record(z.object({
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
  })).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export type Event = EventFormData & {
  id: string;
  project?: string;
  deliverables: number;
  shotRequests: number;
  hasOverlap?: boolean;
  organizationId?: string; // Now mandatory at type level, optional in form schema
  discipline?: "Photography" | "";
  isCovered?: boolean;
  personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
};


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

  if (isBefore(endDate, startDate)) { // Handle overnight events crossing midnight
    endDate = addHours(endDate, 24);
  }

  return { start: startDate, end: endDate };
};

const checkOverlap = (eventA: Event, eventB: Event): boolean => {
  if (eventA.id === eventB.id) return false;

  const timesA = parseEventTimes(eventA.date, eventA.time);
  const timesB = parseEventTimes(eventB.date, eventB.time);

  if (!timesA || !timesB) return false; 

  const basicOverlap = isBefore(timesA.start, timesB.end) && isAfter(timesA.end, timesB.start);
  if (!basicOverlap) return false;

  if (eventA.assignedPersonnelIds && eventA.assignedPersonnelIds.length > 0 &&
      eventB.assignedPersonnelIds && eventB.assignedPersonnelIds.length > 0) {
    const sharedPersonnel = eventA.assignedPersonnelIds.some(id => eventB.assignedPersonnelIds?.includes(id));
    return sharedPersonnel; 
  }
  
  return false; // Only consider it an overlap if shared personnel AND time overlap
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
  const {
    eventsForSelectedProjectAndOrg = [], 
    addEvent,
    updateEvent,
    deleteEvent,
    isLoadingEvents: isLoadingContextEvents,
  } = useEventContext();

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [activeBlockScheduleDateKey, setActiveBlockScheduleDateKey] = useState<string | null>(null);

  const [filterQuickTurnaround, setFilterQuickTurnaround] = useState(false);
  const [filterTimeStatus, setFilterTimeStatus] = useState<"all" | "upcoming" | "past" | "now">("all");
  const [filterAssignedMemberId, setFilterAssignedMemberId] = useState<string>("all");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");
  const [selectedEventDates, setSelectedEventDates] = useState<string[]>([]);
  const [filterCoverageStatus, setFilterCoverageStatus] = useState<"all" | "covered" | "not_covered">("all");


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
      assignedPersonnelIds: [],
      discipline: "",
      isCovered: true, 
      personnelActivity: {},
    }
  });

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
        organizationId: editingEvent.organizationId || "",
        discipline: editingEvent.discipline || "",
        isCovered: editingEvent.isCovered === undefined ? true : editingEvent.isCovered,
        personnelActivity: editingEvent.personnelActivity || {},
      });
    } else {
      const firstProjectForOrg = selectedProject ? selectedProject : (allProjects.length > 0 ? allProjects[0] : null);
      reset({
        name: "",
        projectId: firstProjectForOrg?.id || "",
        date: format(defaultEventDate, "yyyy-MM-dd"),
        time: "09:00 - 17:00",
        priority: "Medium",
        assignedPersonnelIds: [],
        isQuickTurnaround: false,
        deadline: "",
        organizationId: firstProjectForOrg?.organizationId || "",
        discipline: "",
        isCovered: true,
        personnelActivity: {},
      });
    }
  }, [editingEvent, reset, isEventModalOpen, selectedProject, allProjects, activeBlockScheduleDateKey]);


  const assignedPersonnelForFilter = useMemo(() => {
    if (isLoadingContextEvents || !eventsForSelectedProjectAndOrg) return [];
    const personnelIds = new Set<string>();
    (eventsForSelectedProjectAndOrg || []).forEach(event => {
      event.assignedPersonnelIds?.forEach(id => personnelIds.add(id));
    });
    return initialPersonnelMock.filter(person => personnelIds.has(person.id));
  }, [eventsForSelectedProjectAndOrg, isLoadingContextEvents]);


  const displayableEvents = useMemo(() => {
    if (isLoadingContextEvents) return [];
    let filtered = eventsForSelectedProjectAndOrg || [];

    if (filterQuickTurnaround) {
      filtered = filtered.filter(event => event.isQuickTurnaround);
    }

    if (filterTimeStatus !== "all") {
      const now = new Date();
      filtered = filtered.filter(event => {
        const times = parseEventTimes(event.date, event.time);
        if (!times) return false;
        if (filterTimeStatus === "upcoming") return isAfter(times.start, now);
        if (filterTimeStatus === "past") return isBefore(times.end, now);
        if (filterTimeStatus === "now") return isWithinInterval(now, { start: times.start, end: times.end });
        return true;
      });
    }

    if (filterAssignedMemberId !== "all") {
      filtered = filtered.filter(event => event.assignedPersonnelIds?.includes(filterAssignedMemberId));
    }

    if (filterDiscipline !== "all") {
      filtered = filtered.filter(event => {
        if (filterDiscipline === "Photography") return event.discipline === "Photography";
        // if (filterDiscipline === "Video") return event.discipline === "Video" || event.discipline === "Both";
        // if (filterDiscipline === "Photography") return event.discipline === "Photography" || event.discipline === "Both";
        return true; // "all" or unhandled
      });
    }
    
    if (filterCoverageStatus !== "all") {
      if (filterCoverageStatus === "covered") {
        filtered = filtered.filter(event => event.isCovered === true);
      } else if (filterCoverageStatus === "not_covered") {
        filtered = filtered.filter(event => event.isCovered === false || event.isCovered === undefined);
      }
    }

    if (selectedEventDates.length > 0) {
      filtered = filtered.filter(event => selectedEventDates.includes(event.date));
    }

    const eventsGroupedByDay: Record<string, Event[]> = filtered.reduce((acc, event) => {
        const date = event.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
    }, {});

    return filtered.map(event => {
      let hasOverlap = false;
      const dayEvents = eventsGroupedByDay[event.date] || [];
      for (const otherEvent of dayEvents) {
        if (checkOverlap(event, otherEvent)) {
          hasOverlap = true;
          break;
        }
      }
      return { ...event, hasOverlap };
    }).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime() || (parseEventTimes(a.date, a.time)?.start.getTime() || 0) - (parseEventTimes(b.date, b.time)?.start.getTime() || 0) );
  }, [eventsForSelectedProjectAndOrg, isLoadingContextEvents, filterQuickTurnaround, filterTimeStatus, filterAssignedMemberId, filterDiscipline, selectedEventDates, filterCoverageStatus]);


  const groupedAndSortedEventsForDisplay = useMemo(() => {
    const grouped = displayableEvents.reduce((acc, event) => {
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
  }, [displayableEvents]);

  const uniqueEventDatesForFilter = useMemo(() => {
    const dates = new Set((eventsForSelectedProjectAndOrg || []).map(event => event.date));
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [eventsForSelectedProjectAndOrg]);


  useEffect(() => {
    if (groupedAndSortedEventsForDisplay.length > 0) {
      const firstDateKey = groupedAndSortedEventsForDisplay[0][0];
      if (!activeBlockScheduleDateKey || !groupedAndSortedEventsForDisplay.find(g => g[0] === activeBlockScheduleDateKey)) {
        setActiveBlockScheduleDateKey(firstDateKey);
      }
    } else {
      setActiveBlockScheduleDateKey(null);
    }
  }, [groupedAndSortedEventsForDisplay, activeBlockScheduleDateKey]);


  const handleEventSubmit: SubmitHandler<EventFormData> = (data) => {
    const selectedProjInfo = allProjects.find(p => p.id === data.projectId);
    if (!selectedProjInfo) {
      toast({ title: "Error", description: "Selected project not found.", variant: "destructive" });
      return;
    }

    const eventPayload = {
      ...data,
      project: selectedProjInfo.name,
      organizationId: selectedProjInfo.organizationId,
      discipline: data.discipline || "", 
      isCovered: data.isCovered === undefined ? true : data.isCovered,
      personnelActivity: data.personnelActivity || {},
    };

    if (editingEvent) {
      const fullUpdatePayload: Partial<Omit<Event, 'id' | 'hasOverlap'>> = {
        ...eventPayload,
        deliverables: editingEvent.deliverables, 
        shotRequests: editingEvent.shotRequests, 
      };
      updateEvent(editingEvent.id, fullUpdatePayload);
      toast({
        title: "Event Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    } else {
      const newEventDataForContext: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> = {
        ...data,
        organizationId: selectedProjInfo.organizationId,
        discipline: data.discipline || "",
        isCovered: data.isCovered === undefined ? true : data.isCovered,
        // personnelActivity is not part of this Omit, it will be added in addEvent
      };
      addEvent(newEventDataForContext);
      toast({
        title: "Event Added",
        description: `"${data.name}" has been successfully added.`,
      });
    }
    closeEventModal();
  };

  const openAddEventModal = () => {
    setEditingEvent(null);
    const currentProjectId = selectedProject?.id || (allProjects.length > 0 ? allProjects[0].id : "");
    const projectInfo = allProjects.find(p => p.id === currentProjectId);
    reset({
      name: "",
      projectId: currentProjectId,
      date: format(activeBlockScheduleDateKey ? parseISO(activeBlockScheduleDateKey) : new Date(), "yyyy-MM-dd"),
      time: "09:00 - 17:00",
      priority: "Medium",
      assignedPersonnelIds: [],
      isQuickTurnaround: false,
      deadline: "",
      organizationId: projectInfo?.organizationId || "",
      discipline: "",
      isCovered: true,
      personnelActivity: {},
    });
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    reset({
      name: event.name,
      projectId: event.projectId,
      date: event.date,
      time: event.time,
      priority: event.priority as EventFormData['priority'],
      assignedPersonnelIds: event.assignedPersonnelIds || [],
      isQuickTurnaround: event.isQuickTurnaround || false,
      deadline: event.deadline || "",
      organizationId: event.organizationId || "",
      discipline: event.discipline || "",
      isCovered: event.isCovered === undefined ? true : event.isCovered,
      personnelActivity: event.personnelActivity || {},
    });
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
      const event = displayableEvents.find(e => e.id === eventToDeleteId);
      deleteEvent(eventToDeleteId);
      toast({
        title: "Event Deleted",
        description: `Event "${event?.name}" has been deleted.`,
        variant: "destructive"
      });
      setEventToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const getDisciplineIcon = (discipline?: Event['discipline']) => {
    if (discipline === "Photography") return <Camera className="h-3.5 w-3.5 opacity-80" />;
    // if (discipline === "Video") return <Video className="h-3.5 w-3.5 opacity-80" />;
    // if (discipline === "Both") return <><Camera className="h-3.5 w-3.5 opacity-80" /><Video className="h-3.5 w-3.5 opacity-80 ml-1" /></>;
    return null;
  };

  const getCoverageIcon = (isCovered?: boolean) => {
    if (isCovered === true) return <Focus className="h-3.5 w-3.5 text-accent opacity-90" title="Covered Event" />;
    return null;
  };


  if (isLoadingSettings || isLoadingProjects || isLoadingContextEvents) {
      return <div>Loading event data and filters...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events Setup</h1>
          <p className="text-muted-foreground">
            {selectedProject ? `Events for ${selectedProject.name}` : "Manage all events, shot requests, timings, and priorities."}
          </p>
        </div>
        <Button onClick={openAddEventModal}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Event
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filter Events</CardTitle>
            <CardDescription>Refine the events shown across all views below.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="filter-quick-turnaround"
                    checked={filterQuickTurnaround}
                    onCheckedChange={(checked) => setFilterQuickTurnaround(!!checked)}
                />
                <Label htmlFor="filter-quick-turnaround" className="font-normal">Quick Turnaround Only</Label>
            </div>
            <div>
                <Label htmlFor="filter-time-status">Time Status</Label>
                <Select value={filterTimeStatus} onValueChange={(value) => setFilterTimeStatus(value as any)}>
                    <SelectTrigger id="filter-time-status">
                        <SelectValue placeholder="Filter by time status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time Statuses</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                        <SelectItem value="now">Happening Now</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filter-assigned-member">Assigned Team Member</Label>
                <Select value={filterAssignedMemberId} onValueChange={setFilterAssignedMemberId} disabled={assignedPersonnelForFilter.length === 0}>
                    <SelectTrigger id="filter-assigned-member">
                        <SelectValue placeholder="Filter by team member" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Team Members</SelectItem>
                        {assignedPersonnelForFilter.map(person => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                        ))}
                         {assignedPersonnelForFilter.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No personnel assigned in current project/org.</p>}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filter-discipline">Discipline</Label>
                <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                    <SelectTrigger id="filter-discipline">
                        <SelectValue placeholder="Filter by discipline" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Disciplines</SelectItem>
                        <SelectItem value="Photography">Photography Only</SelectItem>
                        {/* <SelectItem value="Video">Video Only</SelectItem> */}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="filter-coverage-status">Coverage Status</Label>
                <Select value={filterCoverageStatus} onValueChange={(value) => setFilterCoverageStatus(value as any)}>
                    <SelectTrigger id="filter-coverage-status">
                        <SelectValue placeholder="Filter by coverage status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="covered">Covered Events Only</SelectItem>
                        <SelectItem value="not_covered">Non-Covered Events Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="lg:col-span-1">
              <Label htmlFor="filter-specific-dates">Filter by Specific Dates</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" id="filter-specific-dates" className={cn("w-full justify-start text-left font-normal", selectedEventDates.length === 0 && "text-muted-foreground")}>
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    {selectedEventDates.length === 0
                      ? "All Event Dates"
                      : selectedEventDates.length === 1
                      ? format(parseISO(selectedEventDates[0]), "PPP")
                      : `${selectedEventDates.length} dates selected`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-72 overflow-y-auto" align="start">
                  <DropdownMenuLabel>Select Dates</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {uniqueEventDatesForFilter.length > 0 ? (
                    uniqueEventDatesForFilter.map(dateStr => (
                      <DropdownMenuCheckboxItem
                        key={dateStr}
                        checked={selectedEventDates.includes(dateStr)}
                        onCheckedChange={(checked) => {
                          setSelectedEventDates(prev =>
                            checked
                              ? [...prev, dateStr]
                              : prev.filter(d => d !== dateStr)
                          );
                        }}
                      >
                        {format(parseISO(dateStr), "PPP")}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>No event dates available</DropdownMenuItem>
                  )}
                  {selectedEventDates.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSelectedEventDates([])}
                        className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90 hover:text-destructive-foreground hover:bg-destructive"
                      >
                        Clear Selection
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </CardContent>
      </Card>

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
                          onValueChange={(value) => {
                            field.onChange(value);
                            const projInfo = allProjects.find(p => p.id === value);
                            setValue("organizationId", projInfo?.organizationId || "");
                          }}
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
                             {allProjects.length === 0 && <p className="p-2 text-xs text-muted-foreground">No projects available. Add one first.</p>}
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
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-discipline" className="text-right col-span-1">Discipline</Label>
                  <div className="col-span-3">
                    <Controller
                      name="discipline"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value || ""}>
                          <SelectTrigger className={errors.discipline ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select discipline (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">N/A</SelectItem>
                            <SelectItem value="Photography">Photography</SelectItem>
                            {/* <SelectItem value="Video">Video</SelectItem>
                            <SelectItem value="Both">Both Photo & Video</SelectItem> */}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.discipline && <p className="text-xs text-destructive mt-1">{errors.discipline.message}</p>}
                  </div>
                </div>
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
                  <Label htmlFor="event-isCovered" className="text-right col-span-1">Coverage</Label>
                  <div className="col-span-3 flex items-center">
                    <Controller
                        name="isCovered"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                            id="event-isCovered"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mr-2"
                            />
                        )}
                    />
                    <Label htmlFor="event-isCovered" className="font-normal text-sm">This event requires production coverage.</Label>
                    {errors.isCovered && <p className="text-xs text-destructive mt-1">{errors.isCovered.message}</p>}
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
                        {initialPersonnelMock.filter(p=> p.role !== "Client").map((person) => ( // Filter out 'Client' role
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
                        {initialPersonnelMock.filter(p=> p.role !== "Client").length === 0 && <p className="text-muted-foreground text-xs">No personnel in system. Add them via Personnel page.</p>}
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
                Visualizes events grouped by day. Events with potential time conflicts (overlapping time and shared personnel) are marked with <AlertTriangle className="inline h-4 w-4 text-destructive" />.
                {selectedProject ? ` (Filtered for ${selectedProject.name})` : " (Showing all projects)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedAndSortedEventsForDisplay.length > 0 ? (
                groupedAndSortedEventsForDisplay.map(([date, dayEvents]) => (
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
                                {event.isQuickTurnaround && <Zap className="h-5 w-5 text-red-500" title="Quick Turnaround"/>}
                                {getCoverageIcon(event.isCovered)}
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
                              {event.hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive" title="Potential Time Conflict (Overlapping time with shared personnel)" />}
                            </CardDescription>
                             {event.deadline && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                Deadline: {formatDeadline(event.deadline)}
                              </p>
                            )}
                          </CardHeader>
                          <CardContent className="flex-grow space-y-1 text-xs">
                            {!selectedProject && event.project && (
                              <p className="text-muted-foreground">Project: {event.project}</p>
                            )}
                             {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 && (
                              <p className="text-muted-foreground flex items-center">
                                <Users className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                                Assigned: {event.assignedPersonnelIds.length}
                              </p>
                            )}
                             <Link href={`/events/${event.id}/shots`} className="text-accent hover:underline flex items-center">
                                <ListChecks className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                                Shot Requests: {event.shotRequests}
                            </Link>
                             <p className="text-muted-foreground flex items-center gap-1">
                              {getDisciplineIcon(event.discipline)}
                              {event.discipline ? event.discipline : 'N/A'}
                            </p>
                            <p className="text-muted-foreground">Deliverables: {event.deliverables}</p>
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
                  No events scheduled {selectedProject ? `for ${selectedProject.name}` : ""} that match your filter criteria. {useDemoData ? 'Toggle "Load Demo Data" in settings, adjust filters, or add an event.' : 'Add an event or adjust filters.'}
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
                ({displayableEvents.length} events found)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayableEvents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      {!selectedProject && <TableHead>Project</TableHead>}
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Discipline</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Shot Requests</TableHead>
                      <TableHead>Deliverables</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayableEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium flex items-center gap-1.5">
                           {event.isQuickTurnaround && <Zap className="h-4 w-4 text-red-500" title="Quick Turnaround"/>}
                           {getCoverageIcon(event.isCovered)}
                          {event.name}
                        </TableCell>
                        {!selectedProject && <TableCell>{event.project}</TableCell>}
                        <TableCell className="flex items-center">
                          {format(parseISO(event.date), "PPP")} <span className="text-muted-foreground ml-1">({event.time})</span>
                          {event.hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive" title="Potential Time Conflict (Overlapping time with shared personnel)"/>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {event.deadline ? formatDeadline(event.deadline) : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground flex items-center gap-1">
                          {getDisciplineIcon(event.discipline)}
                          {event.discipline || "N/A"}
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
                  No events found {selectedProject ? `for ${selectedProject.name}` : ""} that match your filter criteria. {useDemoData ? 'Toggle "Load Demo Data" in settings, adjust filters, or add an event.' : 'Add an event or adjust filters.'}
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
                 ({displayableEvents.length} total events matching filters)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedAndSortedEventsForDisplay.length > 0 && activeBlockScheduleDateKey ? (
                <Tabs
                  value={activeBlockScheduleDateKey}
                  onValueChange={setActiveBlockScheduleDateKey}
                  className="w-full"
                >
                  <TabsList className="mb-4 overflow-x-auto whitespace-nowrap justify-start h-auto p-1">
                    {groupedAndSortedEventsForDisplay.map(([dateKey, _]) => (
                      <TabsTrigger key={dateKey} value={dateKey} className="px-3 py-1.5">
                        {format(parseISO(dateKey), "EEE, MMM d")}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {groupedAndSortedEventsForDisplay.map(([dateKey, dayEvents]) => (
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
                    No events scheduled {selectedProject ? `for ${selectedProject.name}` : ""} to display in timeline based on current filters.
                  </p>
                  <p>
                    {useDemoData ? 'Add some events for the selected project, adjust your project/event filters, or ensure demo data is loaded.' : 'Add events or adjust filters to see the timeline view.'}
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
    
