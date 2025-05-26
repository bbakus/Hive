
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, UserPlus, CalendarDays, Eye, Edit, Trash2 } from "lucide-react";
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
import { initialEventsMock, type Event } from "@/app/(app)/events/page"; // Import Event type and mock data
import { format } from "date-fns";

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
const initialPersonnelMock: Personnel[] = [
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
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personnelToDeleteId, setPersonnelToDeleteId] = useState<string | null>(null);
  
  const [isViewScheduleModalOpen, setIsViewScheduleModalOpen] = useState(false);
  const [viewingScheduleForPersonnel, setViewingScheduleForPersonnel] = useState<Personnel | null>(null);
  const [eventsForSelectedPersonnel, setEventsForSelectedPersonnel] = useState<Event[]>([]);

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
        id: `user${String(personnelList.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
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
    const assignedEvents = useDemoData ? initialEventsMock.filter(event => 
        event.assignedPersonnelIds?.includes(person.id)
    ) : [];
    setEventsForSelectedPersonnel(assignedEvents);
    setIsViewScheduleModalOpen(true);
  };


  if (isLoadingSettings) {
    return <div>Loading personnel data settings...</div>;
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
                        <TableCell>{format(new Date(event.date), "PPP")}</TableCell>
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
          <CardTitle>Team Roster</CardTitle>
          <CardDescription>List of all team members and their current status. ({personnelList.length} members)</CardDescription>
        </CardHeader>
        <CardContent>
          {personnelList.length > 0 ? (
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
                {personnelList.map((member) => (
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
              No team members found. {useDemoData ? 'Toggle "Load Demo Data" in settings or add a new member.' : 'Add a new team member to get started.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Personnel Assignment Interface</CardTitle>
            <CardDescription>Assign team members based on availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Drag-and-drop or selection interface for assigning personnel to events. (Coming Soon)</p>
            <img src="https://placehold.co/600x400.png" alt="Assignment Interface Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="assignment board schedule" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Team Schedule Visualization</CardTitle>
            <CardDescription>Visualize team member schedules (e.g., Gantt chart, calendar).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Visual representation of team schedules. (Coming Soon)</p>
            <img src="https://placehold.co/600x400.png" alt="Schedule Visualization Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="gantt chart team" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


    