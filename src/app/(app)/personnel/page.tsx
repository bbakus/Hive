
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CalendarDays, Eye, Edit, Trash2, Filter as FilterIcon, Users, Workflow, GanttChartSquare } from "lucide-react";
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
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useEventContext, type Event } from "@/contexts/EventContext"; 
import { format, parseISO } from "date-fns";

// --- Personnel Definitions ---
const personnelSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }),
  avatar: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  status: z.enum(["Available", "Assigned", "On Leave"]),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

export type Personnel = PersonnelFormData & {
  id: string;
};

// Initial Mock data
export const initialPersonnelMock: Personnel[] = [
  { id: "user001", name: "Alice Wonderland", role: "Lead Camera Operator", status: "Available", avatar: "https://placehold.co/40x40.png" },
  { id: "user002", name: "Bob The Builder", role: "Audio Engineer", status: "Assigned", avatar: "https://placehold.co/40x40.png" },
  { id: "user003", name: "Charlie Chaplin", role: "Producer", status: "Available", avatar: "https://placehold.co/40x40.png" },
  { id: "user004", name: "Diana Prince", role: "Drone Pilot", status: "On Leave", avatar: "https://placehold.co/40x40.png" },
  { id: "user005", name: "Edward Scissorhands", role: "Grip", status: "Assigned" },
  { id: "user006", name: "Fiona Gallagher", role: "Coordinator", status: "Available" },
  { id: "user007", name: "George Jetson", role: "Tech Lead", status: "Assigned" },
];
// --- End Personnel Definitions ---

export default function PersonnelPage() {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { allEvents, isLoadingEvents } = useEventContext(); 
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personnelToDeleteId, setPersonnelToDeleteId] = useState<string | null>(null);
  
  const [isViewScheduleModalOpen, setIsViewScheduleModalOpen] = useState(false);
  const [viewingScheduleForPersonnel, setViewingScheduleForPersonnel] = useState<Personnel | null>(null);
  const [eventsForSelectedPersonnel, setEventsForSelectedPersonnel] = useState<Event[]>([]);

  const [filterText, setFilterText] = useState("");
  const { toast } = useToast();

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
      role: "",
      avatar: "",
      status: "Available",
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
        role: "",
        avatar: "",
        status: "Available",
      });
    }
  }, [editingPersonnel, reset, isPersonnelModalOpen]);

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
        );
    }
    setEventsForSelectedPersonnel(assignedEvents);
    setIsViewScheduleModalOpen(true);
  };

  const filteredPersonnelList = useMemo(() => {
    if (!filterText) {
      return personnelList;
    }
    return personnelList.filter(member =>
      member.name.toLowerCase().includes(filterText.toLowerCase()) ||
      member.role.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [personnelList, filterText]);


  if (isLoadingSettings || isLoadingEvents) { 
    return <div>Loading personnel data and event context...</div>;
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

      {/* Add/Edit Personnel Modal */}
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
                  <Input id="role" {...register("role")} className={errors.role ? "border-destructive" : ""} />
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

      {/* Delete Confirmation Dialog */}
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

      {/* View Schedule Modal */}
      {viewingScheduleForPersonnel && (
        <Dialog open={isViewScheduleModalOpen} onOpenChange={setIsViewScheduleModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule for {viewingScheduleForPersonnel.name}</DialogTitle>
              <DialogDescription>
                List of events {viewingScheduleForPersonnel.name} is assigned to.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              {eventsForSelectedPersonnel.length > 0 ? (
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
                    {eventsForSelectedPersonnel.map((event) => (
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
                placeholder="Filter by name or role..."
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
                       <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Assign to Event</span>
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5 text-accent" />Personnel Assignment Interface (Concept)</CardTitle>
            <CardDescription>Assign team members based on availability and project needs.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Future: This section will feature a visual interface to assign personnel to events and specific roles. 
              Users will be able to see availability, skills, and current assignments to make informed decisions.
            </p>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/30 min-h-[200px]">
              <div>
                <h4 className="font-semibold text-sm mb-2">Available Team Members</h4>
                <ul className="space-y-1 text-xs">
                  {initialPersonnelMock.slice(0, 3).map(p => <li key={`assign-avail-${p.id}`} className="p-1.5 bg-background rounded-sm shadow-sm">{p.name} ({p.role})</li>)}
                   <li>... more</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Project Events / Roles</h4>
                 <ul className="space-y-1 text-xs">
                  <li className="p-1.5 bg-background rounded-sm shadow-sm">Main Stage - Day 1: Camera Op 1</li>
                  <li className="p-1.5 bg-background rounded-sm shadow-sm">Keynote Speech: Audio Lead</li>
                  <li className="p-1.5 bg-background rounded-sm shadow-sm">Workshop Alpha: Videographer</li>
                  <li>... more</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              (Conceptual UI: Drag-and-drop or selection-based assignment)
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GanttChartSquare className="h-5 w-5 text-accent" />Team Schedule Visualization (Concept)</CardTitle>
            <CardDescription>Visualize team member schedules and event commitments.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Future: A visual timeline (e.g., Gantt chart or calendar view) will display team schedules, 
              event assignments, and potential conflicts or overlaps.
            </p>
            <div className="p-4 border rounded-md bg-muted/30 text-xs space-y-2">
              <div>
                <p className="font-semibold">{initialPersonnelMock[0]?.name || "Team Member A"}:</p>
                <ul className="list-disc list-inside pl-4">
                  <li>{(allEvents && allEvents.length > 0 && allEvents[0]?.name) || "Event Alpha"} ({(allEvents && allEvents.length > 0 && allEvents[0]?.date) || "YYYY-MM-DD"})</li>
                  <li>{(allEvents && allEvents.length > 3 && allEvents[3]?.name) || "Event Beta"} ({(allEvents && allEvents.length > 3 && allEvents[3]?.date) || "YYYY-MM-DD"})</li>
                </ul>
              </div>
               <div>
                <p className="font-semibold">{initialPersonnelMock[1]?.name || "Team Member B"}:</p>
                <ul className="list-disc list-inside pl-4">
                   <li>{(allEvents && allEvents.length > 0 && allEvents[0]?.name) || "Event Alpha"} ({(allEvents && allEvents.length > 0 && allEvents[0]?.date) || "YYYY-MM-DD"})</li>
                   <li>{(allEvents && allEvents.length > 1 && allEvents[1]?.name) || "Event Gamma"} ({(allEvents && allEvents.length > 1 && allEvents[1]?.date) || "YYYY-MM-DD"})</li>
                </ul>
              </div>
              <p className="italic">... and so on for other team members.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    