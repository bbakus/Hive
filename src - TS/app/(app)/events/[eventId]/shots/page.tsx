
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Button, buttonVariants } from '../../../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../components/ui/table";
import { Badge } from "../../../../../components/ui/badge";
import { ArrowLeft, Camera, PlusCircle, Edit, Trash2, AlertTriangle, User, CheckCircle, Info, UserCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../../components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";
import { useToast } from "../../../../../hooks/use-toast";
import { useSettingsContext } from "../../../../../contexts/SettingsContext";
import { useEventContext, type Event, type ShotRequest, type ShotRequestFormData, shotRequestSchemaInternal } from "../../../../../contexts/EventContext";
import { initialPersonnelMock, type Personnel } from "../../../personnel/page";
import { format, parseISO } from "date-fns";
import { usePhaseContext } from '../../../../../contexts/PhaseContext';
import { ShotRequestFormDialog } from '../../../../../components/modals/ShotRequestFormDialog';

const MOCK_CURRENT_USER_ID = "user_admin_ops"; 
const MOCK_CURRENT_USER_NAME = "Ops Admin";

const shotStatuses: ShotRequest['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];
const DEFAULT_SHOT_ASSIGNMENT_VALUE = "--NONE--";


export default function ShotListPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { useDemoData, isLoading: isSettingsContextLoading } = useSettingsContext();
  const { activePhase } = usePhaseContext();
  const {
    getEventById,
    isLoadingEvents: isEventContextLoading,
    shotRequestsByEventId, 
    addShotRequest,
    updateShotRequest,
    deleteShotRequest,
    getShotRequestsForEvent,
  } = useEventContext();

  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [currentShotRequests, setCurrentShotRequests] = useState<ShotRequest[]>([]);

  const [isShotModalOpen, setIsShotModalOpen] = useState(false);
  const [editingShotRequest, setEditingShotRequest] = useState<ShotRequest | null>(null);
  const [isShotDeleteDialogOpen, setIsShotDeleteDialogOpen] = useState(false);
  const [shotRequestToDeleteId, setShotRequestToDeleteId] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  // Effect to update local shot requests when context changes
  useEffect(() => {
    if (eventId && !isEventContextLoading && shotRequestsByEventId) {
      setCurrentShotRequests(shotRequestsByEventId[eventId] || []);
    }
  }, [eventId, shotRequestsByEventId, isEventContextLoading]);


  // Effect to fetch parent event details
   useEffect(() => {
    if (isSettingsContextLoading || isEventContextLoading || !eventId) {
      setEvent(undefined); 
      return;
    }
    const foundEvent = getEventById(eventId);
    setEvent(foundEvent || null); 
  }, [eventId, isSettingsContextLoading, isEventContextLoading, getEventById]);


  const handleShotRequestSubmit = (data: ShotRequestFormData) => {
    if (!eventId) return;

    let dataToSubmit: Partial<ShotRequestFormData> = { 
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assignedPersonnelId: data.assignedPersonnelId || undefined,
        notes: data.notes,
        blockedReason: data.status === "Blocked" ? data.blockedReason : "",
    };
    
    if (editingShotRequest) {
      dataToSubmit.initialCapturerId = editingShotRequest.initialCapturerId;
      
      if (editingShotRequest.status !== data.status) { 
          dataToSubmit.lastStatusModifierId = MOCK_CURRENT_USER_ID;
          dataToSubmit.lastStatusModifiedAt = new Date().toISOString();
          if ((data.status === "Captured" || data.status === "Completed") && !editingShotRequest.initialCapturerId) {
              dataToSubmit.initialCapturerId = MOCK_CURRENT_USER_ID;
          }
      } else { 
        dataToSubmit.lastStatusModifierId = editingShotRequest.lastStatusModifierId;
        dataToSubmit.lastStatusModifiedAt = editingShotRequest.lastStatusModifiedAt;
      }

      updateShotRequest(eventId, editingShotRequest.id, dataToSubmit);
      toast({
        title: "Shot Request Updated",
        description: `"${dataToSubmit.title || dataToSubmit.description?.substring(0,30)}..." has been updated.`,
      });
    } else { 
      dataToSubmit.lastStatusModifierId = MOCK_CURRENT_USER_ID;
      dataToSubmit.lastStatusModifiedAt = new Date().toISOString();
      if ((data.status === "Captured" || data.status === "Completed")) {
            dataToSubmit.initialCapturerId = MOCK_CURRENT_USER_ID;
      }
      
      addShotRequest(eventId, dataToSubmit as ShotRequestFormData);
      toast({
        title: "Shot Request Added",
        description: `"${data.title || data.description.substring(0,30)}..." has been added.`,
      });
    }
    setIsShotModalOpen(false);
    setEditingShotRequest(null);
  };

  const openAddShotModal = () => {
    setEditingShotRequest(null);
    setIsShotModalOpen(true);
  };

  const openEditShotModal = (shot: ShotRequest) => {
    setEditingShotRequest(shot);
    setIsShotModalOpen(true);
  };

  const handleDeleteShotClick = (shotId: string) => {
    setShotRequestToDeleteId(shotId);
    setIsShotDeleteDialogOpen(true);
  };

  const confirmDeleteShot = () => {
    if (shotRequestToDeleteId && eventId) {
      const shot = currentShotRequests.find(sr => sr.id === shotRequestToDeleteId);
      deleteShotRequest(eventId, shotRequestToDeleteId);
      toast({
        title: "Shot Request Deleted",
        description: `Shot "${shot?.title || shot?.description.substring(0,30)}..." has been deleted.`,
        variant: "destructive"
      });
      setShotRequestToDeleteId(null);
    }
    setIsShotDeleteDialogOpen(false);
  };

  const handleStatusChange = (shotId: string, newStatus: ShotRequest['status']) => {
    if (!eventId) return;
    const shotToUpdate = currentShotRequests.find(sr => sr.id === shotId);
    if (shotToUpdate) {
      let updatePayload: Partial<ShotRequestFormData> = { 
        status: newStatus,
        lastStatusModifierId: MOCK_CURRENT_USER_ID,
        lastStatusModifiedAt: new Date().toISOString(),
      };

      const oldStatus = shotToUpdate.status;

      if (newStatus === "Captured" || newStatus === "Completed") {
        if (!shotToUpdate.initialCapturerId) { 
            updatePayload.initialCapturerId = MOCK_CURRENT_USER_ID;
        } else { 
            updatePayload.initialCapturerId = shotToUpdate.initialCapturerId; 
        }
      } else if ((oldStatus === "Captured" || oldStatus === "Completed") && shotToUpdate.initialCapturerId) {
        updatePayload.initialCapturerId = shotToUpdate.initialCapturerId;
      }
      
      if (newStatus !== "Blocked") {
        updatePayload.blockedReason = ""; 
      }
      
      updateShotRequest(eventId, shotId, updatePayload);
      toast({
        title: "Status Updated",
        description: `Shot status for "${shotToUpdate.title || shotToUpdate.description.substring(0,30)}..." changed to "${newStatus}".`,
      });

      if (newStatus === "Request More") {
        const assignedPersonName = shotToUpdate.assignedPersonnelId
          ? getPersonnelNameById(shotToUpdate.assignedPersonnelId)
          : (event?.assignedPersonnelIds && event.assignedPersonnelIds.length > 0
              ? getPersonnelNameById(event.assignedPersonnelIds[0]) 
              : "the assigned team");
        
        const modifierName = getPersonnelNameById(MOCK_CURRENT_USER_ID) || MOCK_CURRENT_USER_NAME;

        toast({
          title: "Notification Simulated",
          description: `A push notification for "Request More" on shot "${shotToUpdate.title || shotToUpdate.description.substring(0,30)}..." (modified by ${modifierName}) would be sent to ${assignedPersonName}.`,
          variant: "default",
          duration: 7000,
        });
      }
    }
  };

  const personnelAssignedToEvent = useMemo(() => {
    if (!event || !event.assignedPersonnelIds) return [];
    return initialPersonnelMock.filter(person => event.assignedPersonnelIds!.includes(person.id));
  }, [event]);

  const getPersonnelNameById = useCallback((id?: string) : string => {
    if (!id) return "Unknown User";
    const person = initialPersonnelMock.find(p => p.id === id);
    return person ? person.name : "Unknown User";
  }, []);

  const isLoading = isSettingsContextLoading || isEventContextLoading || event === undefined;

  if (isLoading) {
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

  const backButtonHref = activePhase === "Shoot" ? "/shoot" : "/events";
  const backButtonText = activePhase === "Shoot" ? "Back to Shoot Day Overview" : "Back to All Events";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href={backButtonHref}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {backButtonText}
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

      <ShotRequestFormDialog
        isOpen={isShotModalOpen}
        onOpenChange={setIsShotModalOpen}
        editingShotRequest={editingShotRequest}
        onSubmit={handleShotRequestSubmit}
        parentEvent={event}
        personnelAssignedToEvent={personnelAssignedToEvent}
      />
        
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Shot Requests</CardTitle>
            <CardDescription>Define and track all required shots for this event. ({currentShotRequests.length} shots)</CardDescription>
          </div>
          <Button onClick={openAddShotModal} variant="accent">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add Shot Request
          </Button>
        </CardHeader>
        <CardContent>
          {currentShotRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Title</TableHead>
                  <TableHead className="w-[35%]">Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentShotRequests.map((shot) => (
                  <TableRow key={shot.id}>
                    <TableCell className="font-medium max-w-[150px] truncate" title={shot.title || ""}>
                        {shot.title || <span className="italic text-muted-foreground">No Title</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                        <p className="truncate" title={shot.description}>{shot.description}</p>
                        {shot.status === "Blocked" && shot.blockedReason && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1" title={shot.blockedReason}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Blocked: {shot.blockedReason.substring(0, 50)}{shot.blockedReason.length > 50 ? "..." : ""}
                            </p>
                        )}
                        {shot.initialCapturerId && (
                             <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Initially Captured by: {getPersonnelNameById(shot.initialCapturerId)}
                             </p>
                        )}
                        {shot.status === "Completed" && shot.lastStatusModifierId && (
                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                                <UserCheck className="h-3.5 w-3.5" />
                                Completed by: {getPersonnelNameById(shot.lastStatusModifierId)}
                                {shot.lastStatusModifiedAt ? ` on ${format(parseISO(shot.lastStatusModifiedAt), "MMM d, p")}` : ""}
                            </p>
                        )}
                        {shot.status !== "Completed" && shot.lastStatusModifierId && 
                            (shot.lastStatusModifierId !== shot.initialCapturerId || !shot.initialCapturerId) && (
                             <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                                <Info className="h-3.5 w-3.5" />
                                Last update: {getPersonnelNameById(shot.lastStatusModifierId)}
                                {shot.lastStatusModifiedAt ? ` on ${format(parseISO(shot.lastStatusModifiedAt), "MMM d, p")}`: ""}
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
                                ? `Event Team (${event.assignedPersonnelIds.map(id => getPersonnelNameById(id)).join(', ').substring(0,30)}${event.assignedPersonnelIds.map(id => getPersonnelNameById(id)).join(', ').length > 30 ? '...' : ''})`
                                : "Event Team (Unassigned)"}
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
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No shot requests defined for this event yet.</p>
              <p>Click "Add Shot Request" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
