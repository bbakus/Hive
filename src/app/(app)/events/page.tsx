
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarDays as CalendarIconLucide, Eye, AlertTriangle, Users, ListChecks, Zap, Filter as FilterIcon, Camera as CameraIconLucide, Video } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type Project } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useOrganizationContext, type Organization, ALL_ORGANIZATIONS_ID } from "@/contexts/OrganizationContext";
import { format, parseISO, isValid, isAfter, isBefore, isWithinInterval, startOfDay, endOfDay, addHours } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EventFormDialog, type EventFormDialogData } from "@/components/modals/EventFormDialog";
import { BlockScheduleView } from "@/components/block-schedule-view";
import { useEventContext, type Event } from "@/contexts/EventContext";
import { initialPersonnelMock, PHOTOGRAPHY_ROLES, type Personnel } from "@/app/(app)/personnel/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const parseEventTimes = (dateStr: string, timeStr: string): { start: Date; end: Date } | null => {
  if (!dateStr || !timeStr) return null;

  let baseDate;
  try {
    baseDate = parseISO(dateStr.replace(/\//g, '-'));
  } catch (e) {
    console.error("Invalid date string for parseISO:", dateStr, e);
    return null;
  }

  if (!isValid(baseDate)) {
    return null;
  }

  const parts = timeStr.split(' - ');
  if (parts.length !== 2) return null;

  const [startTimeStr, endTimeStr] = parts;
  const [startHour, startMinute] = startTimeStr.split(':').map(Number);
  const [endHour, endMinute] = endTimeStr.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return null;

  let startDate = startOfDay(baseDate);
  startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startHour, startMinute);

  let endDate = startOfDay(baseDate);
  endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endHour, endMinute);

  if (isBefore(endDate, startDate) || (endDate.getHours() === 0 && endDate.getMinutes() === 0 && (startHour !== 0 || startMinute !== 0))) {
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
  return false;
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

const getCoverageIcon = (isCovered?: boolean) => {
  if (isCovered === true) return <Eye className="h-4 w-4 text-accent opacity-90 flex-shrink-0" title="Covered Event" />;
  return <Eye className="h-4 w-4 text-muted-foreground/50 opacity-70 flex-shrink-0" title="Not Covered" />;
};

const getDisciplineIcon = (discipline?: Event['discipline']) => {
  if (discipline === "Photography") return <CameraIconLucide className="h-3.5 w-3.5 opacity-80 flex-shrink-0 text-primary" />;
  return null;
};

type EventFiltersProps = {
  filterQuickTurnaround: boolean;
  setFilterQuickTurnaround: (checked: boolean) => void;
  filterTimeStatus: string;
  setFilterTimeStatus: (value: string) => void;
  filterAssignedMemberId: string;
  setFilterAssignedMemberId: (value: string) => void;
  assignedPersonnelForFilter: Personnel[];
  filterDiscipline: string;
  setFilterDiscipline: (value: string) => void;
  filterCoverageStatus: string;
  setFilterCoverageStatus: (value: string) => void;
  selectedEventDates: string[];
  setSelectedEventDates: (dates: string[]) => void;
  uniqueEventDatesForFilter: string[];
};

function EventFilters({
  filterQuickTurnaround, setFilterQuickTurnaround,
  filterTimeStatus, setFilterTimeStatus,
  filterAssignedMemberId, setFilterAssignedMemberId,
  assignedPersonnelForFilter,
  filterDiscipline, setFilterDiscipline,
  filterCoverageStatus, setFilterCoverageStatus,
  selectedEventDates, setSelectedEventDates,
  uniqueEventDatesForFilter
}: EventFiltersProps) {
  return (
    <div className="p-3 px-4 border rounded-none bg-card/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="filter-quick-turnaround"
            checked={filterQuickTurnaround}
            onCheckedChange={(checked) => setFilterQuickTurnaround(!!checked)}
            className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
          />
          <Label htmlFor="filter-quick-turnaround" className="font-normal whitespace-nowrap">Quick Turnaround Only</Label>
        </div>
        <div>
          <Label htmlFor="filter-time-status" className="text-xs">Time Status</Label>
          <Select value={filterTimeStatus} onValueChange={(value) => setFilterTimeStatus(value as any)}>
            <SelectTrigger id="filter-time-status" className="h-9">
              <SelectValue placeholder="Filter by time" />
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
          <Label htmlFor="filter-assigned-member" className="text-xs">Assigned Member</Label>
          <Select value={filterAssignedMemberId} onValueChange={setFilterAssignedMemberId} disabled={assignedPersonnelForFilter.length === 0}>
            <SelectTrigger id="filter-assigned-member" className="h-9">
              <SelectValue placeholder="Filter by member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {assignedPersonnelForFilter.map(person => (
                <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
              ))}
              {assignedPersonnelForFilter.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No personnel assigned in current view.</p>}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-discipline" className="text-xs">Discipline</Label>
          <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
            <SelectTrigger id="filter-discipline" className="h-9">
              <SelectValue placeholder="Filter by discipline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              <SelectItem value="Photography">Photography Only</SelectItem>
              <SelectItem value="na_or_other">N/A or Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-coverage-status" className="text-xs">Coverage</Label>
          <Select value={filterCoverageStatus} onValueChange={(value) => setFilterCoverageStatus(value as any)}>
            <SelectTrigger id="filter-coverage-status" className="h-9">
              <SelectValue placeholder="Filter by coverage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="covered">Covered Only</SelectItem>
              <SelectItem value="not_covered">Non-Covered Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-specific-dates" className="text-xs">Specific Dates</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" id="filter-specific-dates" className={cn("w-full justify-start text-left font-normal h-9", selectedEventDates.length === 0 && "text-muted-foreground")}>
                <CalendarIconLucide className="mr-2 h-4 w-4" />
                {selectedEventDates.length === 0
                  ? "All Dates"
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
                      setSelectedEventDates(
                        checked
                          ? [...selectedEventDates, dateStr]
                          : selectedEventDates.filter(d => d !== dateStr)
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
      </div>
    </div>
  );
}

type DailyOverviewTabContentProps = {
  groupedAndSortedEventsForDisplay: [string, Event[]][];
  selectedProject: Project | null;
  useDemoData: boolean;
  openEditEventModal: (event: Event) => void;
  organizations: Organization[];
};

function DailyOverviewTabContent({ groupedAndSortedEventsForDisplay, selectedProject, useDemoData, openEditEventModal, organizations }: DailyOverviewTabContentProps) {
  return (
    <Card className="mt-4 border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarIconLucide className="h-6 w-6 text-primary" /> Daily Schedule Overview</CardTitle>
        <CardDescription>
          Visualizes events grouped by day. Events with potential time conflicts (overlapping time and shared personnel) are marked with <AlertTriangle className="inline h-4 w-4 text-destructive" />.
          {selectedProject ? ` (Filtered for ${selectedProject.name})` : " (Showing all projects)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groupedAndSortedEventsForDisplay.length > 0 ? (
          groupedAndSortedEventsForDisplay.map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="text-xl font-semibold mb-3">
                {format(parseISO(date), "EEEE, MMMM do, yyyy")}
              </h3>
              <div className="space-y-4">
                {dayEvents.map((event) => (
                   <Card key={event.id} className="hover:border-foreground/30 transition-colors">
                     <div className="p-4 flex justify-between items-start gap-4">
                        <div className="flex-grow space-y-1">
                          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                            {getCoverageIcon(event.isCovered)}
                            <span className="truncate" title={event.name}>{event.name}</span>
                            {event.isQuickTurnaround && <Zap className="h-4 w-4 text-accent ml-1.5 flex-shrink-0" title="Quick Turnaround"/>}
                          </CardTitle>
                           <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1.5">
                                  <p>{event.time}</p>
                                  {event.hasOverlap && <AlertTriangle className="ml-1 h-4 w-4 text-destructive flex-shrink-0" title="Potential Time Conflict (Overlapping time with shared personnel)" />}
                                  <Badge variant={
                                  event.priority === "Critical" ? "destructive" :
                                  event.priority === "High" ? "secondary" :
                                  event.priority === "Medium" ? "outline" : "default"
                                  } className="ml-2 text-xs whitespace-nowrap">{event.priority}</Badge>
                              </div>
                              {(!selectedProject || organizations.length > 1) && event.project && (
                              <p className="text-xs mt-0.5 truncate" title={event.project}>
                                  Project: {event.project}
                              </p>
                              )}
                           </div>

                          <div className="pt-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                              {event.deadline && (
                                  <p className="text-foreground/80 whitespace-nowrap">
                                  Deadline: {formatDeadline(event.deadline)}
                                  </p>
                              )}
                              {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 && (
                                  <p className="flex items-center gap-1 whitespace-nowrap">
                                  <Users className="h-3.5 w-3.5 opacity-80 flex-shrink-0" />
                                  Assigned: {event.assignedPersonnelIds.length}
                                  </p>
                              )}
                              <Link href={`/shot-planner?eventId=${event.id}`} className="text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                                  <ListChecks className="h-3.5 w-3.5 opacity-80 flex-shrink-0 text-primary" />
                                  Shot Requests: {event.shotRequests}
                              </Link>
                              {event.discipline && (
                                  <p className="flex items-center gap-1 whitespace-nowrap">
                                  {getDisciplineIcon(event.discipline)}
                                  {event.discipline || "N/A"}
                                  </p>
                              )}
                              <p className="whitespace-nowrap">Deliverables: {event.deliverables}</p>
                          </div>
                       </div>
                       <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                          <Link href={`/shot-planner?eventId=${event.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Manage Shots
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditEventModal(event)} className="w-full sm:w-auto">
                          <Edit className="mr-2 h-4 w-4" /> Edit Event
                        </Button>
                       </div>
                     </div>
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
  );
}

type EventListTabContentProps = {
  displayableEvents: Event[];
  selectedProject: Project | null;
  useDemoData: boolean;
  openEditEventModal: (event: Event) => void;
  handleDeleteClick: (eventId: string) => void;
  organizations: Organization[];
};

function EventListTabContent({ displayableEvents, selectedProject, useDemoData, openEditEventModal, handleDeleteClick, organizations }: EventListTabContentProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary" /> Event List (Table View)</CardTitle>
        <CardDescription>
          {selectedProject ? `Events scheduled for ${selectedProject.name}.` : "Overview of all scheduled events and their details."}
          ({displayableEvents.length} events found)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayableEvents.length > 0 ? (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  {(!selectedProject || organizations.length > 1) && <TableHead>Project</TableHead>}
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
                      {getCoverageIcon(event.isCovered)}
                      {event.name}
                      {event.isQuickTurnaround && <Zap className="h-4 w-4 text-accent ml-1.5 flex-shrink-0" title="Quick Turnaround"/>}
                    </TableCell>
                    {(!selectedProject || organizations.length > 1) && <TableCell>{event.project}</TableCell>}
                    <TableCell className="flex items-center">
                      {event.date ? format(parseISO(event.date), "PPP") : 'N/A'} <span className="text-muted-foreground ml-1">({event.time})</span>
                      {event.hasOverlap && <AlertTriangle className="ml-2 h-4 w-4 text-destructive flex-shrink-0" title="Potential Time Conflict (Overlapping time with shared personnel)"/>}
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
                      <Link href={`/shot-planner?eventId=${event.id}`} className="text-primary hover:underline">
                        {event.shotRequests}
                      </Link>
                    </TableCell>
                    <TableCell>{event.deliverables}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-foreground/80" asChild>
                        <Link href={`/shot-planner?eventId=${event.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View/Manage Shots</span>
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-foreground/80" onClick={() => openEditEventModal(event)}>
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
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No events found {selectedProject ? `for ${selectedProject.name}` : ""} that match your filter criteria. {useDemoData ? 'Toggle "Load Demo Data" in settings, adjust filters, or add an event.' : 'Add an event or adjust filters.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type BlockScheduleTabContentProps = {
  displayableEvents: Event[];
  openEditEventModal: (event: Event) => void;
  selectedProject: Project | null;
  useDemoData: boolean;
  allPersonnel: Personnel[];
  selectedEventDates: string[]; // For determining which date to show
};

function BlockScheduleTabContent({
  displayableEvents,
  openEditEventModal,
  selectedProject,
  useDemoData,
  allPersonnel,
  selectedEventDates
}: BlockScheduleTabContentProps) {

  const activeBlockScheduleDate = useMemo(() => {
    if (selectedEventDates.length > 0) {
      const sortedSelectedDates = [...selectedEventDates].sort((a,b) => new Date(a.replace(/\//g, '-')).getTime() - new Date(b.replace(/\//g, '-')).getTime());
      const dateObj = parseISO(sortedSelectedDates[0].replace(/\//g, '-'));
      return isValid(dateObj) ? dateObj : null;
    }
     // Fallback: if no dates selected via filter, try to find the first date from displayableEvents
     if (displayableEvents.length > 0 && !selectedEventDates.length) {
        const sortedEvents = [...displayableEvents].sort((a,b) => new Date(a.date.replace(/\//g, '-')).getTime() - new Date(b.date.replace(/\//g, '-')).getTime());
        const dateObj = parseISO(sortedEvents[0].date.replace(/\//g, '-'));
        return isValid(dateObj) ? dateObj : null;
    }
    return null;
  }, [selectedEventDates, displayableEvents]);

  const eventsForBlockSchedule = useMemo(() => {
    if (!activeBlockScheduleDate) return [];
    const dateKey = format(activeBlockScheduleDate, "yyyy-MM-dd"); 
    return displayableEvents.filter(event => event.date === dateKey);
  }, [activeBlockScheduleDate, displayableEvents]);

  const personnelForActiveDate = useMemo(() => {
    if (!activeBlockScheduleDate) return [];
    const personnelIds = new Set<string>();
    eventsForBlockSchedule.forEach(event => {
      event.assignedPersonnelIds?.forEach(id => personnelIds.add(id));
    });
    return allPersonnel
        .filter(p => personnelIds.has(p.id) && PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role !== "Client")
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeBlockScheduleDate, eventsForBlockSchedule, allPersonnel]);


  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarIconLucide className="h-6 w-6 text-primary" /> Block Schedule (Timeline View)</CardTitle>
        <CardDescription>
          View events for the selected date(s) from the main filter, laid out on an hourly timeline by assigned photographer.
          {activeBlockScheduleDate ? ` Showing schedule for ${format(activeBlockScheduleDate, "PPP")}.` : " Select date(s) from the main filters to view schedule."}
          {selectedProject ? ` (Filtered for ${selectedProject.name})` : " (Showing all projects)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeBlockScheduleDate && eventsForBlockSchedule.length > 0 ? (
          <BlockScheduleView
            selectedDate={activeBlockScheduleDate}
            eventsForDate={eventsForBlockSchedule}
            personnelForDay={personnelForActiveDate}
            onEditEvent={openEditEventModal}
            allPersonnel={allPersonnel}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground rounded-none min-h-[400px] flex flex-col items-center justify-center bg-muted/20">
            <CalendarIconLucide size={48} className="mb-4 text-muted" />
            <p className="text-lg font-medium">
              {selectedEventDates.length > 0 && !activeBlockScheduleDate
                ? `Invalid date selected.`
                : selectedEventDates.length > 0 && eventsForBlockSchedule.length === 0
                ? `No events scheduled on ${format(activeBlockScheduleDate!, "PPP")} that match your other filters.`
                : "Please select one or more dates from the main 'Specific Dates' filter to view the block schedule, or ensure events exist for today."
              }
            </p>
            <p>
              {useDemoData ? 'Add some events, adjust filters, or ensure demo data is loaded.' : 'Add events or adjust filters.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EventsPage() {
  const { selectedProject, projects: allProjectsFromContext, isLoadingProjects } = useProjectContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { organizations, isLoadingOrganizations } = useOrganizationContext();
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
  
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filterQuickTurnaround, setFilterQuickTurnaround] = useState(false);
  const [filterTimeStatus, setFilterTimeStatus] = useState<"all" | "upcoming" | "past" | "now">("all");
  const [filterAssignedMemberId, setFilterAssignedMemberId] = useState<string>("all");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");
  const [filterCoverageStatus, setFilterCoverageStatus] = useState<"all" | "covered" | "not_covered">("all");
  const [selectedEventDates, setSelectedEventDates] = useState<string[]>([]);

  const { toast } = useToast();

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
    let filtered: Event[] = [...(eventsForSelectedProjectAndOrg || [])];

    if (filterCoverageStatus !== "all") {
      if (filterCoverageStatus === "covered") {
        filtered = filtered.filter(event => event.isCovered === true);
      } else if (filterCoverageStatus === "not_covered") {
        filtered = filtered.filter(event => event.isCovered === false || event.isCovered === undefined);
      }
    }
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
      if (filterDiscipline === "Photography") {
          filtered = filtered.filter(event => event.discipline === "Photography");
      } else if (filterDiscipline === "na_or_other") {
          filtered = filtered.filter(event => !event.discipline || event.discipline === "" );
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
    }, {} as Record<string, Event[]>);

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
    }).sort((a,b) => {
      const dateAVal = a.date ? parseISO(a.date.replace(/\//g, '-')).getTime() : 0;
      const dateBVal = b.date ? parseISO(b.date.replace(/\//g, '-')).getTime() : 0;
      if (dateAVal !== dateBVal) return dateAVal - dateBVal;

      const timesA = parseEventTimes(a.date, a.time);
      const timesB = parseEventTimes(b.date, b.time);
      const timeAStart = timesA ? timesA.start.getTime() : 0;
      const timeBStart = timesB ? timesB.start.getTime() : 0;
      return timeAStart - timeBStart;
    });
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
    return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA.replace(/\//g, '-')).getTime() - new Date(dateB.replace(/\//g, '-')).getTime());
  }, [displayableEvents]);

  const uniqueEventDatesForFilter = useMemo(() => {
    let sourceForDateFiltering = eventsForSelectedProjectAndOrg || [];
     if (filterCoverageStatus !== "all") {
      if (filterCoverageStatus === "covered") {
        sourceForDateFiltering = sourceForDateFiltering.filter(event => event.isCovered === true);
      } else if (filterCoverageStatus === "not_covered") {
        sourceForDateFiltering = sourceForDateFiltering.filter(event => event.isCovered === false || event.isCovered === undefined);
      }
    }
    if (filterQuickTurnaround) {
      sourceForDateFiltering = sourceForDateFiltering.filter(event => event.isQuickTurnaround);
    }
     if (filterTimeStatus !== "all") {
      const now = new Date();
      sourceForDateFiltering = sourceForDateFiltering.filter(event => {
        const times = parseEventTimes(event.date, event.time);
        if (!times) return false;
        if (filterTimeStatus === "upcoming") return isAfter(times.start, now);
        if (filterTimeStatus === "past") return isBefore(times.end, now);
        if (filterTimeStatus === "now") return isWithinInterval(now, { start: times.start, end: times.end });
        return true;
      });
    }
    if (filterAssignedMemberId !== "all") {
      sourceForDateFiltering = sourceForDateFiltering.filter(event => event.assignedPersonnelIds?.includes(filterAssignedMemberId));
    }
    if (filterDiscipline !== "all") {
      if (filterDiscipline === "Photography") {
          sourceForDateFiltering = sourceForDateFiltering.filter(event => event.discipline === "Photography");
      } else if (filterDiscipline === "na_or_other") {
          sourceForDateFiltering = sourceForDateFiltering.filter(event => !event.discipline || event.discipline === "" );
      }
    }
    const dates = new Set(sourceForDateFiltering.map(event => event.date));
    return Array.from(dates).sort((a, b) => new Date(a.replace(/\//g, '-')).getTime() - new Date(b.replace(/\//g, '-')).getTime());
  }, [eventsForSelectedProjectAndOrg, filterCoverageStatus, filterQuickTurnaround, filterTimeStatus, filterAssignedMemberId, filterDiscipline]);


  const handleEventSubmit = (data: EventFormDialogData, existingEventId?: string) => {
    const selectedProjInfo = allProjectsFromContext.find(p => p.id === data.projectId);
    if (!selectedProjInfo) {
      toast({ title: "Error", description: "Selected project not found.", variant: "destructive" });
      return;
    }

    const eventPayload: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap'> = {
      name: data.name,
      projectId: data.projectId,
      date: data.date,
      time: data.time,
      priority: data.priority,
      assignedPersonnelIds: data.assignedPersonnelIds || [],
      isQuickTurnaround: data.isQuickTurnaround || false,
      deadline: data.deadline || "",
      organizationId: data.organizationId || selectedProjInfo.organizationId,
      discipline: data.discipline || "",
      isCovered: data.isCovered === undefined ? true : data.isCovered,
      personnelActivity: data.personnelActivity || {},
    };

    let currentEventId = existingEventId;

    if (editingEvent && currentEventId) {
      const fullUpdatePayload: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>> = {
        ...eventPayload,
        deliverables: editingEvent.deliverables,
        shotRequests: editingEvent.shotRequests,
      };
      updateEvent(currentEventId, fullUpdatePayload);
      toast({
        title: "Event Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    } else {
      currentEventId = addEvent({...eventPayload, project: selectedProjInfo.name });
      toast({
        title: "Event Added",
        description: `"${data.name}" has been successfully added.`,
      });
    }

    // Handle quick shot descriptions
    if (currentEventId && data.quickShotDescriptionsInput) {
      const descriptions = data.quickShotDescriptionsInput
        .split('\n')
        .map(desc => desc.trim())
        .filter(desc => desc.length > 0);
      
      descriptions.forEach(desc => {
        // Assuming addShotRequest is available in context, or pass it down/handle differently
        // This part needs to be connected to the EventContext's addShotRequest.
        console.log(`Would add shot: '${desc}' to eventId: ${currentEventId}`);
      });
    }

    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const openAddEventModal = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
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

  const firstSelectedDateForDialog = useMemo(() => {
    if (selectedEventDates.length > 0) {
        const sortedDates = [...selectedEventDates].sort((a,b) => new Date(a.replace(/\//g, '-')).getTime() - new Date(b.replace(/\//g, '-')).getTime());
        return sortedDates[0];
    }
     if (displayableEvents.length > 0 && !selectedEventDates.length) {
        const sortedEvents = [...displayableEvents].sort((a,b) => new Date(a.date.replace(/\//g, '-')).getTime() - new Date(b.date.replace(/\//g, '-')).getTime());
        return sortedEvents[0].date;
    }
    return null; 
  }, [selectedEventDates, displayableEvents]);


  if (isLoadingSettings || isLoadingProjects || isLoadingContextEvents || isLoadingOrganizations) {
      return <div>Loading event data and filters...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight">Events Setup</p>
          <p className="text-muted-foreground">
            {selectedProject ? `Events for ${selectedProject.name}` : "Manage all events, shot requests, timings, and priorities."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="w-auto font-normal text-sm px-3 py-2 h-9"
            onClick={() => setFiltersOpen(prev => !prev)}
          >
            <FilterIcon className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button onClick={openAddEventModal} variant="outline" className="px-3 py-2 h-9">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Event
          </Button>
        </div>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full mb-4"
        value={filtersOpen ? "event-filters" : undefined}
        onValueChange={(value) => setFiltersOpen(value === "event-filters")}
      >
        <AccordionItem value="event-filters" className="border-0">
          <AccordionTrigger className="!py-0 !px-0 hover:!no-underline [&_svg]:hidden sr-only">
             {/* This trigger is visually hidden but makes the accordion programmatically controllable */}
            <span className="sr-only">Toggle Filters</span>
          </AccordionTrigger>
          <AccordionContent className="pt-0"> {/* Adjusted padding if trigger is effectively hidden */}
            <EventFilters
                filterQuickTurnaround={filterQuickTurnaround}
                setFilterQuickTurnaround={setFilterQuickTurnaround}
                filterTimeStatus={filterTimeStatus}
                setFilterTimeStatus={setFilterTimeStatus}
                filterAssignedMemberId={filterAssignedMemberId}
                setFilterAssignedMemberId={setFilterAssignedMemberId}
                assignedPersonnelForFilter={assignedPersonnelForFilter}
                filterDiscipline={filterDiscipline}
                setFilterDiscipline={setFilterDiscipline}
                filterCoverageStatus={filterCoverageStatus}
                setFilterCoverageStatus={setFilterCoverageStatus}
                selectedEventDates={selectedEventDates}
                setSelectedEventDates={setSelectedEventDates}
                uniqueEventDatesForFilter={uniqueEventDatesForFilter}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>


      <EventFormDialog
        isOpen={isEventModalOpen}
        onOpenChange={setIsEventModalOpen}
        editingEvent={editingEvent}
        onSubmit={handleEventSubmit}
        allProjects={allProjectsFromContext}
        allPersonnel={initialPersonnelMock}
        activeBlockScheduleDate={firstSelectedDateForDialog}
      />

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
            <AlertDialogAction onClick={confirmDelete} className={cn(buttonVariants({variant: "destructive"}))}>Delete Event</AlertDialogAction>
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
            <DailyOverviewTabContent
                groupedAndSortedEventsForDisplay={groupedAndSortedEventsForDisplay}
                selectedProject={selectedProject}
                useDemoData={useDemoData}
                openEditEventModal={openEditEventModal}
                organizations={organizations}
            />
        </TabsContent>

        <TabsContent value="event-list">
            <EventListTabContent
                displayableEvents={displayableEvents}
                selectedProject={selectedProject}
                useDemoData={useDemoData}
                openEditEventModal={openEditEventModal}
                handleDeleteClick={handleDeleteClick}
                organizations={organizations}
            />
        </TabsContent>

        <TabsContent value="block-schedule">
            <BlockScheduleTabContent
                displayableEvents={displayableEvents}
                openEditEventModal={openEditEventModal}
                selectedProject={selectedProject}
                useDemoData={useDemoData}
                allPersonnel={initialPersonnelMock}
                selectedEventDates={selectedEventDates}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
