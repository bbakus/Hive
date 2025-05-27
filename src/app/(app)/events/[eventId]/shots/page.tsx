
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, PlusCircle, Edit, Trash2, AlertTriangle, User, CheckCircle } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData, shotRequestSchemaInternal } from "@/contexts/EventContext";
import { initialPersonnelMock, type Personnel } from "@/app/(app)/personnel/page";


export default function ShotListPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { useDemoData, isLoading: isSettingsContextLoading } = useSettingsContext();
  const {
    getEventById,
    isLoadingEvents: isEventContextLoading,
    getShotRequestsForEvent,
    addShotRequest,
    updateShotRequest,
    deleteShotRequest
  } = useEventContext();

  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [currentShotRequests, setCurrentShotRequests] = useState<ShotRequest[]>([]);

  const [isShotModalOpen, setIsShotModalOpen] = useState(false);
  const [editingShotRequest, setEditingShotRequest] = useState<ShotRequest | null>(null);
  const [isShotDeleteDialogOpen, setIsShotDeleteDialogOpen] = useState(false);
  const [shotRequestToDeleteId, setShotRequestToDeleteId] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShotRequestFormData>({
    resolver: zodResolver(shotRequestSchemaInternal),
    defaultValues: {
      description: "",
      priority: "Medium",
      status: "Unassigned",
      assignedPersonnelId: "",
      notes: "",
      blockedReason: "",
      capturedById: "",
    },
  });

  const watchedStatus = watch("status");

  const refreshShotRequests = useCallback(() => {
    if (eventId && !isEventContextLoading) {
        setCurrentShotRequests(getShotRequestsForEvent(eventId));
    }
  }, [eventId, isEventContextLoading, getShotRequestsForEvent]);


  useEffect(() => {
    if (isSettingsContextLoading || isEventContextLoading || !eventId) {
      setEvent(undefined); // Indicate loading or inability to load
      setCurrentShotRequests([]);
      return;
    }

    const foundEvent = getEventById(eventId);
    setEvent(foundEvent || null); // Set to null if not found after loading

    if (foundEvent) {
      refreshShotRequests();
    } else {
      setCurrentShotRequests([]);
    }

  }, [eventId, useDemoData, isSettingsContextLoading, isEventContextLoading, getEventById, refreshShotRequests]);


  useEffect(() => {
    if (isShotModalOpen) {
        if (editingShotRequest) {
          reset({
            description: editingShotRequest.description,
            priority: editingShotRequest.priority,
            status: editingShotRequest.status,
            assignedPersonnelId: editingShotRequest.assignedPersonnelId || "",
            notes: editingShotRequest.notes || "",
            blockedReason: editingShotRequest.blockedReason || "",
            capturedById: editingShotRequest.capturedById || "",
          });
        } else {
          reset({ // Default for new shot
            description: "",
            priority: "Medium",
            status: "Unassigned",
            assignedPersonnelId: "",
            notes: "",
            blockedReason: "",
            capturedById: "",
          });
        }
    }
  }, [editingShotRequest, reset, isShotModalOpen]);

  useEffect(() => {
    if (watchedStatus !== "Blocked") {
      setValue("blockedReason", "");
    }
    if (watchedStatus !== "Captured" && watchedStatus !== "Completed") {
      setValue("capturedById", ""); // Clear capturedBy if status is not Captured or Completed
    }
  }, [watchedStatus, setValue]);


  const handleShotRequestSubmit: SubmitHandler<ShotRequestFormData> = (data) => {
    if (!eventId) return;

    let dataToSubmit = { ...data };
    if (data.status !== "Blocked") {
      dataToSubmit.blockedReason = "";
    }
     if (data.status !== "Captured" && data.status !== "Completed") {
      dataToSubmit.capturedById = undefined;
    }
    if (data.assignedPersonnelId === "") { 
        dataToSubmit.assignedPersonnelId = undefined;
    }

    if (editingShotRequest) {
      updateShotRequest(eventId, editingShotRequest.id, dataToSubmit);
      toast({
        title: "Shot Request Updated",
        description: `"${dataToSubmit.description.substring(0,30)}..." has been updated.`,
      });
    } else {
      addShotRequest(eventId, dataToSubmit);
      toast({
        title: "Shot Request Added",
        description: `"${dataToSubmit.description.substring(0,30)}..." has been added.`,
      });
    }
    refreshShotRequests();
    closeShotModal();
  };

  const openAddShotModal = () => {
    setEditingShotRequest(null);
    reset({
      description: "",
      priority: "Medium",
      status: "Unassigned",
      assignedPersonnelId: "",
      notes: "",
      blockedReason: "",
      capturedById: "",
    });
    setIsShotModalOpen(true);
  };

  const openEditShotModal = (shot: ShotRequest) => {
    setEditingShotRequest(shot);
     reset({
      description: shot.description,
      priority: shot.priority,
      status: shot.status,
      assignedPersonnelId: shot.assignedPersonnelId || "",
      notes: shot.notes || "",
      blockedReason: shot.blockedReason || "",
      capturedById: shot.capturedById || "",
    });
    setIsShotModalOpen(true);
  };

  const closeShotModal = () => {
    setIsShotModalOpen(false);
    setEditingShotRequest(null);
  };

  const handleDeleteShotClick = (shotId: string) => {
    setShotRequestToDeleteId(shotId);
    setIsShotDeleteDialogOpen(true);
  };

  const confirmDeleteShot = () => {
    if (shotRequestToDeleteId && eventId) {
      const shot = currentShotRequests.find(sr => sr.id === shotRequestToDeleteId);
      deleteShotRequest(eventId, shotRequestToDeleteId);
      refreshShotRequests();
      toast({
        title: "Shot Request Deleted",
        description: `Shot "${shot?.description.substring(0,30)}..." has been deleted.`,
        variant: "destructive"
      });
      setShotRequestToDeleteId(null);
    }
    setIsShotDeleteDialogOpen(false);
  };

  const handleStatusChange = (shotId: string, newStatus: ShotRequestFormData['status']) => {
    if (!eventId) return;
    const shotToUpdate = currentShotRequests.find(sr => sr.id === shotId);
    if (shotToUpdate) {
      let updatePayload: Partial<ShotRequestFormData> = { status: newStatus };

      if (newStatus !== "Blocked") {
        updatePayload.blockedReason = "";
      }
       if (newStatus !== "Captured" && newStatus !== "Completed") {
        updatePayload.capturedById = undefined;
      }

      if (newStatus === "Captured" || newStatus === "Completed") {
        const defaultCaptureUser = shotToUpdate.assignedPersonnelId || event?.assignedPersonnelIds?.[0] || "";
        const capturedBy = window.prompt("Enter ID of photographer who captured this shot:", defaultCaptureUser);
        if (capturedBy !== null) { // If user clicks OK (even if empty)
          updatePayload.capturedById = capturedBy || undefined; // Store empty string as undefined
        } else { // User clicked cancel, so don't change status or capturedBy
          return;
        }
      }
      
      updateShotRequest(eventId, shotId, updatePayload);
      refreshShotRequests();
      toast({
        title: "Status Updated",
        description: `Shot status changed to "${newStatus}". ${updatePayload.capturedById ? 'Captured by ' + getPersonnelNameById(updatePayload.capturedById) : ''}`,
      });

      if (newStatus === "Request More") {
        const assignedPersonName = shotToUpdate.assignedPersonnelId
          ? getPersonnelNameById(shotToUpdate.assignedPersonnelId)
          : (event?.assignedPersonnelIds && event.assignedPersonnelIds.length > 0
              ? getPersonnelNameById(event.assignedPersonnelIds[0]) // just take the first for demo
              : "team");

        toast({
          title: "Notification Simulated",
          description: `A push notification for "Request More" on shot "${shotToUpdate.description.substring(0,30)}..." would be sent to ${assignedPersonName || "the assigned user/team"}.`,
          variant: "default",
          duration: 5000,
        });
      }
    }
  };

  const personnelAssignedToEvent = useMemo(() => {
    if (!event || !event.assignedPersonnelIds) return [];
    return initialPersonnelMock.filter(person => event.assignedPersonnelIds!.includes(person.id));
  }, [event]);

  const getPersonnelNameById = (id?: string) : string => {
    if (!id) return "Unknown";
    return initialPersonnelMock.find(p => p.id === id)?.name || "Unknown";
  };


  if (isSettingsContextLoading || isEventContextLoading || event === undefined) {
    return <div className="flex items-center justify-center h-screen">Loading event shot list...</div>;
  }

  if (event === null) {
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <p className="text-xl text-muted-foreground">Event not found.</p>
             <p className="text-sm text-muted-foreground">{!useDemoData && "Demo data is turned off or this event does not exist in the current context."}</p>
            <Button asChild variant="outline">
                <Link href="/events">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
                </Link>
            </Button>
        </div>
    );
  }

  const shotStatuses: ShotRequest['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];


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

      <AlertDialog open={isShotDeleteDialogOpen} onOpenChange={setIsShotDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shot Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shot request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShotRequestToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteShot} className={buttonVariants({ variant: "destructive" })}>Delete Shot</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isShotModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeShotModal(); else setIsShotModalOpen(true);
      }}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingShotRequest ? "Edit Shot Request" : "Add New Shot Request"}</DialogTitle>
              <DialogDescription>
                {editingShotRequest ? "Update the details for this shot." : "Fill in the details for the new shot."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleShotRequestSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <div className="col-span-3">
                  <Input id="description" {...register("description")} className={errors.description ? "border-destructive" : ""} />
                  {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
                </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">Priority</Label>
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
                          {shotStatuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
                </div>
              </div>

               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignedPersonnelId" className="text-right">Assign Shot To</Label>
                <div className="col-span-3">
                   <Controller
                    name="assignedPersonnelId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                        <SelectTrigger className={errors.assignedPersonnelId ? "border-destructive" : ""}>
                          <SelectValue placeholder="-- Event's Assigned Personnel --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Event's Assigned Personnel --</SelectItem>
                          {personnelAssignedToEvent.map(person => (
                            <SelectItem key={person.id} value={person.id}>{person.name} ({person.role})</SelectItem>
                          ))}
                           {personnelAssignedToEvent.length === 0 && <p className="p-2 text-xs text-muted-foreground">No personnel assigned to parent event.</p>}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optional. Defaults to event's assigned team.</p>
                  {errors.assignedPersonnelId && <p className="text-xs text-destructive mt-1">{errors.assignedPersonnelId.message}</p>}
                </div>
              </div>

              {watchedStatus === "Blocked" && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="blockedReason" className="text-right pt-2">Blocked Reason</Label>
                  <div className="col-span-3">
                    <Textarea
                      id="blockedReason"
                      {...register("blockedReason")}
                      placeholder="Reason why this shot is blocked..."
                      className={errors.blockedReason ? "border-destructive" : ""}
                    />
                    {errors.blockedReason && <p className="text-xs text-destructive mt-1">{errors.blockedReason.message}</p>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                <div className="col-span-3">
                  <Textarea id="notes" {...register("notes")} placeholder="Optional notes, camera settings, talent cues..." />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={closeShotModal}>Cancel</Button>
                </DialogClose>
                <Button type="submit">{editingShotRequest ? "Save Changes" : "Add Shot"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Shot Requests</CardTitle>
            <CardDescription>Define and track all required shots for this event. ({currentShotRequests.length} shots)</CardDescription>
          </div>
          <Button onClick={openAddShotModal}>
            <PlusCircle className="mr-2 h-5 w-5" />
            Add Shot Request
          </Button>
        </CardHeader>
        <CardContent>
          {currentShotRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentShotRequests.map((shot) => (
                  <TableRow key={shot.id}>
                    <TableCell className="font-medium max-w-xs">
                        <p className="truncate" title={shot.description}>{shot.description}</p>
                        {shot.status === "Blocked" && shot.blockedReason && (
                            <p className="text-xs text-destructive mt-1" title={shot.blockedReason}>
                            <AlertTriangle className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" />
                            Blocked: {shot.blockedReason.substring(0, 50)}{shot.blockedReason.length > 50 ? "..." : ""}
                            </p>
                        )}
                        {(shot.status === "Captured" || shot.status === "Completed") && shot.capturedById && (
                             <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Captured by: {getPersonnelNameById(shot.capturedById)}
                             </p>
                        )}
                    </TableCell>
                    <TableCell>
                       <Badge variant={
                        shot.priority === "Critical" ? "destructive" :
                        shot.priority === "High" ? "secondary" :
                        shot.priority === "Medium" ? "outline" :
                        "default"
                      }>{shot.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                        {shot.assignedPersonnelId ? (
                            <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                {getPersonnelNameById(shot.assignedPersonnelId)}
                            </span>
                        ) : (
                            <span className="text-muted-foreground italic">
                                {event?.assignedPersonnelIds && event.assignedPersonnelIds.length > 0
                                ? `Event Team (${event.assignedPersonnelIds.map(id => getPersonnelNameById(id)).join(', ')})`
                                : "Event Team"}
                            </span>
                        )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={shot.status}
                        onValueChange={(newStatus) => handleStatusChange(shot.id, newStatus as ShotRequest['status'])}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs p-1.5">
                           <Badge
                            className="w-full justify-center"
                            variant={
                                shot.status === "Captured" ? "default" :
                                shot.status === "Completed" ? "default" :
                                shot.status === "Unassigned" ? "outline" :
                                shot.status === "Assigned" ? "secondary" :
                                shot.status === "Blocked" ? "destructive" :
                                shot.status === "Request More" ? "destructive" : // Or a different warning color
                                "outline"
                            }
                            >
                            {shot.status}
                            </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {shotStatuses.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">
                              <Badge
                                className="w-full justify-center"
                                variant={
                                s === "Captured" ? "default" :
                                s === "Completed" ? "default" :
                                s === "Unassigned" ? "outline" :
                                s === "Assigned" ? "secondary" :
                                s === "Blocked" ? "destructive" :
                                s === "Request More" ? "destructive" : // Or a different warning color
                                "outline"
                                }
                              >
                                {s}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent" onClick={() => openEditShotModal(shot)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Shot</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteShotClick(shot.id)}>
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
