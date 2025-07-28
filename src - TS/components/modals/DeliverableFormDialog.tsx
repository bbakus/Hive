
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "../../lib/utils";
import type { Deliverable } from "../../app/(app)/deliverables/page";
import type { Project } from "../../contexts/ProjectContext";

export const deliverableFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  event: z.string().min(3, "Event name must be at least 3 characters."),
  projectId: z.string().min(1, "Please select a project."),
  dueDate: z.date({ required_error: "Due date is required." }),
  status: z.enum(["Pending", "In Progress", "Completed", "Blocked"]),
  type: z.string().min(2, "Type must be at least 2 characters."),
});

export type DeliverableFormDialogData = z.infer<typeof deliverableFormSchema>;

interface DeliverableFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingDeliverable: Deliverable | null;
  onSubmit: (data: DeliverableFormDialogData) => void;
  allProjects: Project[];
  selectedProject?: Project | null;
}

export function DeliverableFormDialog({
  isOpen,
  onOpenChange,
  editingDeliverable,
  onSubmit,
  allProjects,
  selectedProject,
}: DeliverableFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DeliverableFormDialogData>({
    resolver: zodResolver(deliverableFormSchema),
    defaultValues: {
      name: "",
      event: "",
      projectId: "",
      dueDate: new Date(),
      status: "Pending",
      type: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingDeliverable) {
        reset({
          name: editingDeliverable.name,
          event: editingDeliverable.event,
          projectId: editingDeliverable.projectId,
          dueDate: editingDeliverable.dueDate,
          status: editingDeliverable.status,
          type: editingDeliverable.type,
        });
      } else {
        reset({
          name: "",
          event: "",
          projectId: selectedProject?.id || (allProjects.length > 0 ? allProjects[0].id : ""),
          dueDate: new Date(),
          status: "Pending",
          type: "",
        });
      }
    }
  }, [editingDeliverable, isOpen, reset, allProjects, selectedProject]);

  const internalOnSubmit: SubmitHandler<DeliverableFormDialogData> = (data) => {
    onSubmit(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{editingDeliverable ? "Edit Deliverable" : "Add New Deliverable"}</DialogTitle>
          <DialogDescription>
            {editingDeliverable ? "Update details for this deliverable." : "Fill in the details for the new deliverable."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliverable-name" className="text-right">Name</Label>
            <div className="col-span-3">
              <Input id="deliverable-name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliverable-event" className="text-right">Event</Label>
            <div className="col-span-3">
              <Input id="deliverable-event" {...register("event")} className={errors.event ? "border-destructive" : ""} />
              {errors.event && <p className="text-xs text-destructive mt-1">{errors.event.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliverable-project" className="text-right">Project</Label>
            <div className="col-span-3">
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value || (selectedProject?.id || (allProjects.length > 0 ? allProjects[0].id : ""))}>
                    <SelectTrigger className={errors.projectId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProjects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && <p className="text-xs text-destructive mt-1">{errors.projectId.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliverable-dueDate" className="text-right">Due Date</Label>
            <div className="col-span-3">
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.dueDate ? "border-destructive" : ""
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliverable-status" className="text-right">Status</Label>
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
                      {["Pending", "In Progress", "Completed", "Blocked"].map(s => (
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
            <Label htmlFor="deliverable-type" className="text-right">Type</Label>
            <div className="col-span-3">
              <Input id="deliverable-type" {...register("type")} placeholder="e.g., Video, Images, Report" className={errors.type ? "border-destructive" : ""} />
              {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent">{editingDeliverable ? "Save Changes" : "Add Deliverable"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
