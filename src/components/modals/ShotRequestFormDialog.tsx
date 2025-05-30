
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import type { ShotRequest, ShotRequestFormData, Event } from "@/contexts/EventContext";
import { shotRequestSchemaInternal } from "@/contexts/EventContext"; 
import type { Personnel } from "@/app/(app)/personnel/page";

const shotStatuses: ShotRequest['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];
const DEFAULT_SHOT_ASSIGNMENT_VALUE = "--NONE--";

interface ShotRequestFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingShotRequest: ShotRequest | null;
  onSubmit: (data: ShotRequestFormData) => void;
  parentEvent: Event | null;
  personnelAssignedToEvent: Personnel[];
}

export function ShotRequestFormDialog({
  isOpen,
  onOpenChange,
  editingShotRequest,
  onSubmit,
  parentEvent,
  personnelAssignedToEvent,
}: ShotRequestFormDialogProps) {
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
      title: "",
      description: "",
      priority: "Medium",
      status: "Unassigned",
      assignedPersonnelId: "",
      notes: "",
      blockedReason: "",
      initialCapturerId: "",
      lastStatusModifierId: "",
      lastStatusModifiedAt: "",
    },
  });

  const watchedStatus = watch("status");

  useEffect(() => {
    if (isOpen) {
      if (editingShotRequest) {
        reset({
          title: editingShotRequest.title || "",
          description: editingShotRequest.description,
          priority: editingShotRequest.priority,
          status: editingShotRequest.status,
          assignedPersonnelId: editingShotRequest.assignedPersonnelId || "",
          notes: editingShotRequest.notes || "",
          blockedReason: editingShotRequest.blockedReason || "",
          initialCapturerId: editingShotRequest.initialCapturerId || "",
          lastStatusModifierId: editingShotRequest.lastStatusModifierId || "",
          lastStatusModifiedAt: editingShotRequest.lastStatusModifiedAt || "",
        });
      } else {
        reset({ 
          title: "",
          description: "",
          priority: "Medium",
          status: "Unassigned",
          assignedPersonnelId: "",
          notes: "",
          blockedReason: "",
          initialCapturerId: "",
          lastStatusModifierId: "",
          lastStatusModifiedAt: "",
        });
      }
    }
  }, [editingShotRequest, reset, isOpen]);

  useEffect(() => {
    if (watchedStatus !== "Blocked") {
      setValue("blockedReason", ""); 
    }
  }, [watchedStatus, setValue]);

  const internalOnSubmit: SubmitHandler<ShotRequestFormData> = (data) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{editingShotRequest ? "Edit Shot Request" : "Add New Shot Request"}</DialogTitle>
          <DialogDescription>
            {editingShotRequest ? "Update the details for this shot." : `Fill in the details for the new shot for event: ${parentEvent?.name || 'N/A'}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title (Optional)</Label>
            <div className="col-span-3">
              <Input id="title" {...register("title")} className={errors.title ? "border-destructive" : ""} />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>
          </div>
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
                  <Select
                    onValueChange={(value) => field.onChange(value === DEFAULT_SHOT_ASSIGNMENT_VALUE ? "" : value)}
                    value={field.value || DEFAULT_SHOT_ASSIGNMENT_VALUE}
                  >
                    <SelectTrigger className={errors.assignedPersonnelId ? "border-destructive" : ""}>
                      <SelectValue placeholder="-- Event's Assigned Personnel --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_SHOT_ASSIGNMENT_VALUE}>-- Event's Assigned Personnel --</SelectItem>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent">{editingShotRequest ? "Save Changes" : "Add Shot"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
