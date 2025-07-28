
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon as CalendarIconLucide, PlusCircle, Trash2 } from "lucide-react";
import { useForm, type SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "../../lib/utils";
import type { Event } from "../../contexts/EventContext"; // Updated import
import { useEventContext, type ShotRequestFormData } from "../../contexts/EventContext"; // Import addShotRequest and type
import type { Project } from "../../contexts/ProjectContext";
import { PHOTOGRAPHY_ROLES } from "../../lib/constants";
import { usePersonnelContext, type Personnel } from "../../contexts/PersonnelContext";
import { Textarea } from "../ui/textarea";


export const eventFormSchema = z.object({
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
  discipline: z.enum(["Photography", ""]).optional(),
  isCovered: z.boolean().optional(),
  personnelActivity: z.record(z.object({
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
  })).optional(),
  quickShotDescriptionsInput: z.string().optional(), // For textarea input
});

export type EventFormDialogData = z.infer<typeof eventFormSchema>;

interface EventFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingEvent: Event | null;
  onSubmit: (data: EventFormDialogData, eventId?: string) => void; // Pass eventId back for shot creation
  allProjects: Project[];
  allPersonnel: Personnel[];
  activeBlockScheduleDate?: string | null;
}

export function EventFormDialog({
  isOpen,
  onOpenChange,
  editingEvent,
  onSubmit,
  allProjects,
  allPersonnel,
  activeBlockScheduleDate
}: EventFormDialogProps) {
  const { addShotRequest } = useEventContext();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
    watch,
  } = useForm<EventFormDialogData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      isQuickTurnaround: false,
      deadline: "",
      assignedPersonnelIds: [],
      discipline: "",
      isCovered: true,
      personnelActivity: {},
      organizationId: "",
      quickShotDescriptionsInput: "",
    }
  });

  useEffect(() => {
    let defaultEventDate = new Date();
    if (activeBlockScheduleDate && isValid(parseISO(activeBlockScheduleDate))) {
      defaultEventDate = parseISO(activeBlockScheduleDate);
    }

    const firstProjectForOrg = allProjects.length > 0 ? allProjects[0] : null;

    if (editingEvent && isOpen) {
      const projectForEvent = allProjects.find(p => p.id === editingEvent.projectId);
      reset({
        name: editingEvent.name,
        projectId: editingEvent.projectId,
        date: editingEvent.date,
        time: editingEvent.time,
        priority: "Medium" as EventFormDialogData['priority'], // Default priority since Event type doesn't have priority
        assignedPersonnelIds: editingEvent.assignedPersonnelIds || [],
        isQuickTurnaround: editingEvent.isQuickTurnaround || false,
        deadline: editingEvent.deadline || "",
        organizationId: editingEvent.organizationId || projectForEvent?.organizationId || "",
        discipline: editingEvent.discipline === "Photography" ? "Photography" : "",
        isCovered: editingEvent.isCovered === undefined ? true : editingEvent.isCovered,
        personnelActivity: editingEvent.personnelActivity || {},
        quickShotDescriptionsInput: "", // Clear for edits, or load existing shots if needed
      });
    } else if (!editingEvent && isOpen) {
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
        quickShotDescriptionsInput: "",
      });
    }
  }, [editingEvent, isOpen, reset, allProjects, activeBlockScheduleDate]);
  
  const internalOnSubmit: SubmitHandler<EventFormDialogData> = (data) => {
    onSubmit(data, editingEvent?.id); // Pass editingEvent.id if updating, for context
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl"> {/* Increased width */}
        <DialogHeader>
          <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
          <DialogDescription>
            {editingEvent ? "Update the details for this event." : "Fill in the details below to create a new event."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Left Column for Core Event Details */}
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
                        defaultValue={field.value || (allProjects.length > 0 ? allProjects[0].id : "")}
                      >
                        <SelectTrigger className={errors.projectId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProjects.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                          ))}
                           {allProjects.length === 0 && <p className="p-2 text-xs text-muted-foreground">No projects available.</p>}
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
                                  defaultMonth={
                                      activeBlockScheduleDate && isValid(parseISO(activeBlockScheduleDate)) 
                                          ? parseISO(activeBlockScheduleDate) 
                                          : (field.value ? parseISO(field.value) : new Date())
                                  }
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
                      <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                        <SelectTrigger className={errors.discipline ? "border-destructive" : ""}>
                          <SelectValue placeholder="N/A or Other" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">N/A or Other</SelectItem>
                          <SelectItem value="Photography">Photography</SelectItem>
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
                          checked={field.value === undefined ? true : field.value}
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

            {/* Right Column for Personnel & Quick Shots */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Assign Personnel</Label>
                <ScrollArea className="h-48 w-full rounded-none border p-4">
                  <Controller
                    name="assignedPersonnelIds"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <div className="space-y-2">
                        {allPersonnel.filter(p=> PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role !== "Client").map((person) => (
                          <div key={person.personnelId} className="flex items-center space-x-2">
                            <Checkbox
                              id={`event-dialog-person-${person.personnelId}`}
                              checked={field.value?.includes(person.personnelId)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), person.personnelId])
                                  : field.onChange(
                                      (field.value || []).filter(
                                        (id) => id !== person.personnelId
                                      )
                                    );
                              }}
                            />
                            <Label htmlFor={`event-dialog-person-${person.personnelId}`} className="font-normal">
                              {person.name} <span className="text-xs text-muted-foreground">({person.role})</span>
                            </Label>
                          </div>
                        ))}
                        {allPersonnel.filter(p=> PHOTOGRAPHY_ROLES.includes(p.role as typeof PHOTOGRAPHY_ROLES[number]) && p.role !== "Client").length === 0 && <p className="text-muted-foreground text-xs">No photography team members in system.</p>}
                      </div>
                    )}
                  />
                </ScrollArea>
                {errors.assignedPersonnelIds && <p className="text-xs text-destructive mt-1">{errors.assignedPersonnelIds.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quickShotDescriptionsInput">Initial Shot Ideas (Quick Add)</Label>
                <Textarea
                  id="quickShotDescriptionsInput"
                  {...register("quickShotDescriptionsInput")}
                  placeholder="Enter shot descriptions, one per line. E.g.,&#10;- Wide shot of main stage&#10;- Close-up of keynote speaker&#10;- Crowd reactions"
                  rows={5}
                  className={errors.quickShotDescriptionsInput ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  These will be added as 'Unassigned' shots with 'Medium' priority.
                  For detailed shot management (priorities, specific assignments, notes, etc.), use the 'Manage Shots' link for the event after saving.
                </p>
                {errors.quickShotDescriptionsInput && <p className="text-xs text-destructive mt-1">{errors.quickShotDescriptionsInput.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent">{editingEvent ? "Save Changes" : "Add Event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    