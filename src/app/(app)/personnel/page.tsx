
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
const initialPersonnel: Personnel[] = [
  { id: "user001", name: "Alice Wonderland", role: "Lead Camera Operator", status: "Available", avatar: "https://placehold.co/40x40.png" },
  { id: "user002", name: "Bob The Builder", role: "Audio Engineer", status: "Assigned", avatar: "https://placehold.co/40x40.png" },
  { id: "user003", name: "Charlie Chaplin", role: "Producer", status: "Available", avatar: "https://placehold.co/40x40.png" },
  { id: "user004", name: "Diana Prince", role: "Drone Pilot", status: "On Leave", avatar: "https://placehold.co/40x40.png" },
];
// --- End Personnel Definitions ---

export default function PersonnelPage() {
  const [personnelList, setPersonnelList] = useState<Personnel[]>(initialPersonnel);
  const [isAddPersonnelDialogOpen, setIsAddPersonnelDialogOpen] = useState(false);
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

  const handleAddPersonnelSubmit: SubmitHandler<PersonnelFormData> = (data) => {
    const newPersonnelMember: Personnel = {
      ...data,
      id: `user${String(personnelList.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    };
    setPersonnelList((prevList) => [...prevList, newPersonnelMember]);
    toast({
      title: "Team Member Added",
      description: `"${data.name}" has been successfully added to the roster.`,
    });
    reset();
    setIsAddPersonnelDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel Management</h1>
          <p className="text-muted-foreground">Assign team members to events and visualize schedules.</p>
        </div>
        <Dialog open={isAddPersonnelDialogOpen} onOpenChange={setIsAddPersonnelDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-5 w-5" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
              <DialogDescription>
                Fill in the details for the new team member.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddPersonnelSubmit)} className="grid gap-4 py-4">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Member</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                      <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <CalendarDays className="h-4 w-4" />
                        <span className="sr-only">View Schedule</span>
                      </Button>
                       <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Assign to Event</span>
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
              No team members found. Click "Add Team Member" to get started.
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
