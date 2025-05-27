
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CalendarDays, Eye, Edit, Trash2, Filter as FilterIcon, Users, Workflow, GanttChartSquare, Camera, ListChecks } from "lucide-react";
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
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useEventContext, type Event } from "@/contexts/EventContext"; 
import { useProjectContext } from "@/contexts/ProjectContext"; 
import { format, parseISO } from "date-fns";

const personnelSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }),
  avatar: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  status: z.enum(["Available", "Assigned", "On Leave"]),
  cameraSerial: z.string().optional(),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

export type Personnel = PersonnelFormData & {
  id: string;
};

export const PHOTOGRAPHY_ROLES = ["Photographer", "Editor", "Project Manager", "Client"] as const;

export const initialPersonnelMock: Personnel[] = [
  { id: "user001", name: "Alice Wonderland", role: "Photographer", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN12345A" },
  { id: "user002", name: "Bob The Builder", role: "Photographer", status: "Assigned", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN98765E"},
  { id: "user003", name: "Charlie Chaplin", role: "Project Manager", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN67890B" },
  { id: "user004", name: "Diana Prince", role: "Photographer", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN11223F" },
  { id: "user005", name: "Edward Scissorhands", role: "Editor", status: "Assigned", cameraSerial: "SN24680C" },
  { id: "user006", name: "Fiona Gallagher", role: "Photographer", status: "Available", cameraSerial: "SN13579D" },
  // { id: "user007", name: "George Jetson", role: "Editor", status: "Assigned" }, // No camera serial by default
  { id: "user008", name: "Client Representative", role: "Client", status: "Available" },
];

export default function PersonnelPage() {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { allEvents, isLoadingEvents, getEventById, updateEvent, eventsForSelectedProjectAndOrg } = useEventContext(); 
  const { selectedProject } = useProjectContext();

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personnelToDeleteId, setPersonnelToDeleteId] = useState<string | null>(null);
  
  const [isViewScheduleModalOpen, setIsViewScheduleModalOpen] = useState(false);
  const [viewingScheduleForPersonnel, setViewingScheduleForPersonnel] = useState<Personnel | null>(null);
  const [eventsForSelectedPersonnelInModal, setEventsForSelectedPersonnelInModal] = useState<Event[]>([]);

  const [filterText, setFilterText] = useState("");
  const { toast } = useToast();

  const [selectedEventForAssignment, setSelectedEventForAssignment] = useState<string | null>(null);
  const [eventDetailsForAssignment, setEventDetailsForAssignment] = useState<Event | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      name: "",
      role: "Photographer",
      avatar: "",
      status: "Available",
      cameraSerial: "",
    },
  });
  
  useEffect(() => {
    if (!isLoadingSettings) {
        setPersonnelList(useDemoData ? initialPersonnelMock : []);
    }
  }, [useDemoData, isLoadingSettings]);

  useEffect(() => {
    if (editingPersonnel) {
      reset(editingPersonnel);
    } else {
      reset({
        name: "",
        role: "Photographer",
        avatar: "",
        status: "Available",
        cameraSerial: "",
      });
    }
  }, [editingPersonnel, reset, isPersonnelModalOpen]);

  useEffect(() => {
    if (selectedEventForAssignment && !isLoadingEvents) {
      const event = getEventById(selectedEventForAssignment);
      setEventDetailsForAssignment(event || null);
    } else {
      setEventDetailsForAssignment(null);
    }
  }, [selectedEventForAssignment, getEventById, isLoadingEvents]);

  const handlePersonnelSubmit: SubmitHandler<PersonnelFormData> = (data) => {
    if (editingPersonnel) {
      setPersonnelList(prevList => 
        prevList.map(p => p.id === editingPersonnel.id ? { ...editingPersonnel, ...data } : p)
      );
      toast({
        title: "Team Member Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    } else {
      const newPersonnelMember: Personnel = {
        ...data,
        id: `user${String(personnelList.length + initialPersonnelMock.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      };
      setPersonnelList((prevList) => [...prevList, newPersonnelMember]);
      toast({
        title: "Team Member Added",
        description: `"${data.name}" has been successfully added to the roster.`,
      });
    }
    closePersonnelModal();
  };

  const openAddPersonnelModal = () => {
    setEditingPersonnel(null);
    setIsPersonnelModalOpen(true);
  };

  const openEditPersonnelModal = (personnel: Personnel) => {
    setEditingPersonnel(personnel);
    setIsPersonnelModalOpen(true);
  };

  const closePersonnelModal = () => {
    setIsPersonnelModalOpen(false);
    setEditingPersonnel(null);
  };

  const handleDeleteClick = (personnelId: string) => {
    setPersonnelToDeleteId(personnelId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (personnelToDeleteId) {
      const member = personnelList.find(p => p.id === personnelToDeleteId);
      setPersonnelList(prevList => prevList.filter(p => p.id !== personnelToDeleteId));
      toast({
        title: "Team Member Deleted",
        description: `Team member "${member?.name}" has been deleted.`,
        variant: "destructive"
      });
      setPersonnelToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleViewSchedule = (person: Personnel) => {
    setViewingScheduleForPersonnel(person);
    let assignedEvents: Event[] = [];
    if (!isLoadingEvents && allEvents) { 
        assignedEvents = allEvents.filter(event => 
            event.assignedPersonnelIds?.includes(person.id)
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    setEventsForSelectedPersonnelInModal(assignedEvents);
    setIsViewScheduleModalOpen(true);
  };

  const filteredPersonnelList = useMemo(() => {
    if (!filterText) {
      return personnelList;
    }
    return personnelList.filter(member =>
      member.name.toLowerCase().includes(filterText.toLowerCase()) ||
      member.role.toLowerCase().includes(filterText.toLowerCase()) ||
      (member.cameraSerial && member.cameraSerial.toLowerCase().includes(filterText.toLowerCase()))
    );
  }, [personnelList, filterText]);

  const handleAssignmentToggle = (personnelId: string, isAssigned: boolean) => {
    if (!eventDetailsForAssignment) return;

    let newAssignedPersonnelIds = [...(eventDetailsForAssignment.assignedPersonnelIds || [])];
    if (isAssigned) {
      if (!newAssignedPersonnelIds.includes(personnelId)) {
        newAssignedPersonnelIds.push(personnelId);
      }
    } else {
      newAssignedPersonnelIds = newAssignedPersonnelIds.filter(id => id !== personnelId);
    }
    
    const updatedEventData = { assignedPersonnelIds: newAssignedPersonnelIds };
    updateEvent(eventDetailsForAssignment.id, updatedEventData);
    
    setEventDetailsForAssignment(prev => prev ? {...prev, assignedPersonnelIds: newAssignedPersonnelIds} : null);

    const person = personnelList.find(p => p.id === personnelId);
    toast({
      title: "Assignment Updated",
      description: `${person?.name || 'Team member'} ${isAssigned ? 'assigned to' : 'unassigned from'} ${eventDetailsForAssignment.name}.`,
    });
  };


  if (isLoadingSettings || isLoadingEvents) { 
    return <div>Loading personnel data, event context, and project context...</div>;
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel Management</h1>
          <p className="text-muted-foreground">Assign team members to events and visualize schedules.</p>
        </div>
        <Button onClick={openAddPersonnelModal}>
            <UserPlus className="mr-2 h-5 w-5" />
            Add Team Member
        </Button>
      </div>

      <Dialog open={isPersonnelModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closePersonnelModal(); else setIsPersonnelModalOpen(true);
      }}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingPersonnel ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
              <DialogDescription>
                {editingPersonnel ? "Update the details for this team member." : "Fill in the details for the new team member."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handlePersonnelSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <div className="col-span-3">
                  <Input id="name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <div className="col-span-3">
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {PHOTOGRAPHY_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="avatar" className="text-right">Avatar URL</Label>
                <div className="col-span-3">
                  <Input id="avatar" {...register("avatar")} placeholder="https://example.com/avatar.png" className={errors.avatar ? "border-destructive" : ""} />
                  {errors.avatar && <p className="text-xs text-destructive mt-1">{errors.avatar.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cameraSerial" className="text-right">Camera S/N</Label>
                <div className="col-span-3">
                  <Input id="cameraSerial" {...register("cameraSerial")} placeholder="Optional camera serial number" className={errors.cameraSerial ? "border-destructive" : ""} />
                  {errors.cameraSerial && <p className="text-xs text-destructive mt-1">{errors.cameraSerial.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <div className="col-span-3">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Assigned">Assigned</SelectItem>
                          <SelectItem value="On Leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={closePersonnelModal}>Cancel</Button>
                </DialogClose>
                <Button type="submit">{editingPersonnel ? "Save Changes" : "Add Member"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPersonnelToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>Delete Member</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewingScheduleForPersonnel && (
        <Dialog open={isViewScheduleModalOpen} onOpenChange={setIsViewScheduleModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule for {viewingScheduleForPersonnel.name}</DialogTitle>
              <DialogDescription>
                List of events {viewingScheduleForPersonnel.name} is assigned to. Sorted by date.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              {eventsForSelectedPersonnelInModal.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsForSelectedPersonnelInModal.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell>{event.project}</TableCell>
                        <TableCell>{event.date ? format(parseISO(event.date), "PPP") : "N/A"}</TableCell>
                        <TableCell>{event.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center">
                  No events currently assigned to {viewingScheduleForPersonnel.name}.
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Team Roster</CardTitle>
              <CardDescription>
                List of all team members and their current status. 
                (Showing {filteredPersonnelList.length} of {personnelList.length} members)
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Input
                type="text"
                placeholder="Filter by name, role, or S/N..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-10"
              />
              <FilterIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPersonnelList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Camera S/N</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonnelList.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar || `https://placehold.co/40x40.png?text=${member.name.split(" ").map(n => n[0]).join("").toUpperCase()}`} alt={member.name} data-ai-hint="person avatar" />
                          <AvatarFallback>{member.name.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      {member.cameraSerial ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Camera className="h-3.5 w-3.5" /> {member.cameraSerial}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        member.status === "Available" ? "default" :
                        member.status === "Assigned" ? "secondary" :
                        "outline" // for On Leave
                      }>{member.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent" onClick={() => handleViewSchedule(member)}>
                        <CalendarDays className="h-4 w-4" />
                        <span className="sr-only">View Schedule</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-accent" onClick={() => openEditPersonnelModal(member)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteClick(member.id)}>
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
              {filterText ? "No team members found matching your filter." : (useDemoData ? 'Toggle "Load Demo Data" in settings or add a new member.' : 'Add a new team member to get started.')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5 text-accent" />Personnel Assignment</CardTitle>
            <CardDescription>
              {selectedProject ? `Assign personnel to events for ${selectedProject.name}.` : "Select a project to assign personnel to its events."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            { !selectedProject && <p className="text-muted-foreground text-sm">Please select a project from the main header to manage event assignments.</p>}
            { selectedProject && eventsForSelectedProjectAndOrg.length === 0 && <p className="text-muted-foreground text-sm">No events found for {selectedProject.name} to assign personnel.</p>}
            { selectedProject && eventsForSelectedProjectAndOrg.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="event-select-assignment">Select Event</Label>
                  <Select
                    value={selectedEventForAssignment || ""}
                    onValueChange={(value) => setSelectedEventForAssignment(value || null)}
                  >
                    <SelectTrigger id="event-select-assignment">
                      <SelectValue placeholder="Choose an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eventsForSelectedProjectAndOrg.map(event => (
                        <SelectItem key={event.id} value={event.id}>{event.name} ({event.date ? format(parseISO(event.date), "MMM d") : "N/A"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {eventDetailsForAssignment && (
                  <ScrollArea className="h-72 border rounded-md p-3">
                    <h4 className="text-sm font-medium mb-2">Assign team members to: <span className="text-accent">{eventDetailsForAssignment.name}</span></h4>
                    <div className="space-y-2">
                      {personnelList.filter(p => p.role !== "Client").map(person => {
                        const isAssigned = eventDetailsForAssignment.assignedPersonnelIds?.includes(person.id);
                        return (
                          <div key={`assign-${person.id}-${eventDetailsForAssignment.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                            <div className="flex items-center gap-2">
                               <Avatar className="h-7 w-7">
                                <AvatarImage src={person.avatar || `https://placehold.co/40x40.png?text=${person.name.split(" ").map(n => n[0]).join("").toUpperCase()}`} alt={person.name} data-ai-hint="person avatar" />
                                <AvatarFallback>{person.name.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback>
                               </Avatar>
                              <div>
                                <p className="text-sm font-medium">{person.name}</p>
                                <p className="text-xs text-muted-foreground">{person.role}</p>
                              </div>
                            </div>
                            <Checkbox
                              checked={isAssigned}
                              onCheckedChange={(checked) => handleAssignmentToggle(person.id, !!checked)}
                              id={`assign-check-${person.id}-${eventDetailsForAssignment.id}`}
                            />
                          </div>
                        );
                      })}
                      {personnelList.filter(p => p.role !== "Client").length === 0 && <p className="text-xs text-muted-foreground">No team members available for assignment (excluding Clients).</p>}
                    </div>
                  </ScrollArea>
                )}
                 {!eventDetailsForAssignment && selectedEventForAssignment && <p className="text-sm text-muted-foreground">Loading event details...</p>}
                 {!selectedEventForAssignment && eventsForSelectedProjectAndOrg.length > 0 && <p className="text-sm text-muted-foreground">Select an event above to manage its team.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GanttChartSquare className="h-5 w-5 text-accent" />Team Schedule Visualization</CardTitle>
            <CardDescription>View team member schedules and event commitments across all projects. Sorted by date.</CardDescription>
          </CardHeader>
          <CardContent>
            {personnelList.filter(p => p.role !== "Client").length === 0 && <p className="text-sm text-muted-foreground">No team members (excluding Clients) to visualize schedules for.</p>}
            <ScrollArea className="h-[26rem]">
              <div className="space-y-4">
                {personnelList.filter(p => p.role !== "Client").map(person => {
                  const assignments = allEvents.filter(event => event.assignedPersonnelIds?.includes(person.id))
                                      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  return (
                    <div key={`schedule-vis-${person.id}`}>
                      <h4 className="font-semibold text-sm mb-1">{person.name} <span className="text-xs text-muted-foreground">({person.role})</span></h4>
                      {assignments.length > 0 ? (
                        <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
                          {assignments.map(event => (
                            <li key={`assign-event-${event.id}-${person.id}`}>
                              <span className="font-medium">{event.name}</span> ({event.project ? `${event.project}, ` : ''}{event.date ? format(parseISO(event.date), "MMM d, yyyy") : 'N/A'})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No events assigned.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
    
