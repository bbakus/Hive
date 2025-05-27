
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, PlusCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
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
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData, shotRequestSchemaInternal as shotRequestSchema } from "@/contexts/EventContext";


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
    resolver: zodResolver(shotRequestSchema), 
    defaultValues: {
      description: "",
      shotType: "Medium",
      priority: "Medium",
      status: "Unassigned", // Default new shots to "Unassigned"
      notes: "",
      blockedReason: "",
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
      setEvent(undefined); 
      setCurrentShotRequests([]);
      return;
    }
    
    const foundEvent = getEventById(eventId);
    setEvent(foundEvent || null);

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
            shotType: editingShotRequest.shotType,
            priority: editingShotRequest.priority,
            status: editingShotRequest.status,
            notes: editingShotRequest.notes || "",
            blockedReason: editingShotRequest.blockedReason || "",
          });
        } else {
          reset({
            description: "",
            shotType: "Medium",
            priority: "Medium",
            status: "Unassigned", // Default for new shots
            notes: "",
            blockedReason: "",
          });
        }
    }
  }, [editingShotRequest, reset, isShotModalOpen]);

  // Effect to clear blockedReason if status is not "Blocked"
  useEffect(() => {
    if (watchedStatus !== "Blocked") {
      setValue("blockedReason", "");
    }
  }, [watchedStatus, setValue]);


  const handleShotRequestSubmit: SubmitHandler<ShotRequestFormData> = (data) => {
    if (!eventId) return;

    let dataToSubmit = { ...data };
    if (data.status !== "Blocked") {
      dataToSubmit.blockedReason = ""; 
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
      shotType: "Medium",
      priority: "Medium",
      status: "Unassigned",
      notes: "",
      blockedReason: "",
    });
    setIsShotModalOpen(true);
  };

  const openEditShotModal = (shot: ShotRequest) => {
    setEditingShotRequest(shot);
     reset({ 
      description: shot.description,
      shotType: shot.shotType,
      priority: shot.priority,
      status: shot.status,
      notes: shot.notes || "",
      blockedReason: shot.blockedReason || "",
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
      const updatePayload: Partial<ShotRequestFormData> = { status: newStatus };
      if (newStatus !== "Blocked") {
        updatePayload.blockedReason = ""; 
      }
      updateShotRequest(eventId, shotId, updatePayload);
      refreshShotRequests(); 
      toast({
        title: "Status Updated",
        description: `Shot status changed to "${newStatus}".`,
      });

      if (newStatus === "Request More") {
        toast({
          title: "Notification Simulated",
          description: `A push notification for "Request More" on shot "${shotToUpdate.description.substring(0,30)}..." would be sent to the assigned user.`,
          variant: "default",
          duration: 5000,
        });
      }
    }
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

  const shotStatuses: ShotRequestFormData['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];


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
                <Label htmlFor="shotType" className="text-right">Shot Type</Label>
                <div className="col-span-3">
                  <Controller
                    name="shotType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
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
                    </TableCell>
                    <TableCell>{shot.shotType}</TableCell>
                    <TableCell>
                       <Badge variant={
                        shot.priority === "Critical" ? "destructive" :
                        shot.priority === "High" ? "secondary" : 
                        shot.priority === "Medium" ? "outline" : 
                        "default" 
                      }>{shot.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={shot.status}
                        onValueChange={(newStatus) => handleStatusChange(shot.id, newStatus as ShotRequestFormData['status'])}
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
                                shot.status === "Request More" ? "destructive" : 
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
                                s === "Request More" ? "destructive" :
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
    

