
"use client";

import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, PlusCircle, Edit, Trash2 } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Event } from '../page'; // Import Event type from parent page

// Re-using initialEvents from parent for simplicity in this example.
// In a real app, you'd fetch this data or have it in a global state/context.
const initialEventsForShotPage: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 20 },
    { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", projectId: "proj002", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 5 },
    { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", projectId: "proj003", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 3 },
    { id: "evt004", name: "Artist Meet & Greet", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 10 },
    { id: "evt005", name: "Closing Ceremony", project: "Tech Conference X", projectId: "proj002", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 8 },
];

// --- Shot Request Definitions ---
const shotRequestSchema = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  shotType: z.enum(["Wide", "Medium", "Close-up", "Drone", "Gimbal", "Interview", "B-Roll", "Other"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  notes: z.string().optional(),
});

type ShotRequestFormData = z.infer<typeof shotRequestSchema>;

export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
  status: "Planned" | "Assigned" | "Captured" | "Reviewed" | "Blocked";
  // assignedTo?: string; // For future use
};

// Mock Shot Requests - this would typically be fetched or managed globally
const initialShotRequests: ShotRequest[] = [
  { id: "sr001", eventId: "evt001", description: "Opening wide shot of the crowd", shotType: "Wide", priority: "High", status: "Planned", notes: "Get this as gates open" },
  { id: "sr002", eventId: "evt001", description: "Close-up of lead singer - Song 3", shotType: "Close-up", priority: "Critical", status: "Planned" },
  { id: "sr003", eventId: "evt002", description: "Speaker walking onto stage", shotType: "Medium", priority: "High", status: "Captured" },
  { id: "sr004", eventId: "evt001", description: "Drone shot of entire festival area at sunset", shotType: "Drone", priority: "Medium", status: "Assigned", notes: "Requires licensed pilot" },
];
// --- End Shot Request Definitions ---


export default function ShotListPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [shotRequests, setShotRequests] = useState<ShotRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddShotDialogOpen, setIsAddShotDialogOpen] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ShotRequestFormData>({
    resolver: zodResolver(shotRequestSchema),
    defaultValues: {
      description: "",
      shotType: "Medium",
      priority: "Medium",
      notes: "",
    },
  });

  useEffect(() => {
    if (eventId) {
      const foundEvent = initialEventsForShotPage.find(e => e.id === eventId);
      setEvent(foundEvent || null);
      // Filter mock shot requests for the current event
      const eventSpecificShots = initialShotRequests.filter(sr => sr.eventId === eventId);
      setShotRequests(eventSpecificShots);
      setIsLoading(false);
    }
  }, [eventId]);

  const handleAddShotRequestSubmit: SubmitHandler<ShotRequestFormData> = (data) => {
    if (!eventId) return; // Should not happen if page loads correctly

    const newShotRequest: ShotRequest = {
      ...data,
      id: `sr${String(shotRequests.length + initialShotRequests.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`, // Ensure somewhat unique ID
      eventId: eventId,
      status: "Planned", // Default status
    };
    setShotRequests((prevRequests) => [...prevRequests, newShotRequest]);
    toast({
      title: "Shot Request Added",
      description: `"${data.description.substring(0,30)}..." has been added.`,
    });
    reset(); // Reset form fields
    setIsAddShotDialogOpen(false); // Close dialog
  };


  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading event details...</div>;
  }

  if (!event) {
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <p className="text-xl text-muted-foreground">Event not found.</p>
            <Button asChild variant="outline">
                <Link href="/events">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Events
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Camera className="h-8 w-8 text-accent"/> Shot List for: {event.name}
        </h1>
        <p className="text-muted-foreground">Project: {event.project} | Date: {event.date} | Time: {event.time}</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Shot Requests</CardTitle>
            <CardDescription>Define and track all required shots for this event. ({shotRequests.length} shots)</CardDescription>
          </div>
          <Dialog open={isAddShotDialogOpen} onOpenChange={setIsAddShotDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" />
                Add Shot Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Shot Request</DialogTitle>
                <DialogDescription>
                  Fill in the details for the new shot.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddShotRequestSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <div className="col-span-3">
                    <Input id="description" {...register("description")} className={errors.description ? "border-destructive" : ""} />
                    {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="shotType" className="text-right">Shot Type</Label>
                  <div className="col-span-3">
                    <Controller
                      name="shotType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={errors.shotType ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select shot type" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Wide", "Medium", "Close-up", "Drone", "Gimbal", "Interview", "B-Roll", "Other"].map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.shotType && <p className="text-xs text-destructive mt-1">{errors.shotType.message}</p>}
                  </div>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priority" className="text-right">Priority</Label>
                  <div className="col-span-3">
                     <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={errors.priority ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Low", "Medium", "High", "Critical"].map(prio => (
                              <SelectItem key={prio} value={prio}>{prio}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.priority && <p className="text-xs text-destructive mt-1">{errors.priority.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4"> {/* Use items-start for textarea alignment */}
                  <Label htmlFor="notes" className="text-right pt-2">Notes</Label> {/* Add padding-top for alignment */}
                  <div className="col-span-3">
                    <Textarea id="notes" {...register("notes")} placeholder="Optional notes, camera settings, talent cues..." />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Add Shot</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {shotRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shotRequests.map((shot) => (
                  <TableRow key={shot.id}>
                    <TableCell className="font-medium max-w-xs truncate" title={shot.description}>{shot.description}</TableCell>
                    <TableCell>{shot.shotType}</TableCell>
                    <TableCell>
                       <Badge variant={
                        shot.priority === "Critical" ? "destructive" :
                        shot.priority === "High" ? "secondary" : // Assuming secondary is prominent enough for High
                        shot.priority === "Medium" ? "outline" : 
                        "default" // For Low or if default is subtle
                      }>{shot.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        shot.status === "Captured" ? "default" :
                        shot.status === "Reviewed" ? "default" :
                        shot.status === "Planned" ? "outline" :
                        shot.status === "Assigned" ? "secondary" :
                        shot.status === "Blocked" ? "destructive" :
                        "outline"
                      }>{shot.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Shot</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" disabled>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Shot</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Camera size={48} className="mx-auto mb-4" />
              <p className="text-lg font-medium">No shot requests defined for this event yet.</p>
              <p>Click "Add Shot Request" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    