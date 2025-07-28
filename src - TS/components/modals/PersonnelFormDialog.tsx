
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
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { PHOTOGRAPHY_ROLES } from "../../lib/constants";
import { type Personnel } from "../../contexts/PersonnelContext";
import { Textarea } from "../ui/textarea";

// Schema uses a string for input, which is then processed
export const personnelFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }) as z.ZodType<typeof PHOTOGRAPHY_ROLES[number]>,
  avatar: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  status: z.enum(["Available", "Assigned", "On Leave"]),
  cameraSerialsInput: z.string().optional(), // String for comma-separated input
});

// This type is for the form data itself before processing cameraSerials
export type PersonnelFormInputData = z.infer<typeof personnelFormSchema>;

// This type represents what the onSubmit prop expects (with cameraSerials as array)
export type PersonnelFormDialogData = Omit<PersonnelFormInputData, 'cameraSerialsInput'> & {
  cameraSerials?: string[];
};


interface PersonnelFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingPersonnel: Personnel | null;
  onSubmit: (data: PersonnelFormDialogData) => void;
}

export function PersonnelFormDialog({
  isOpen,
  onOpenChange,
  editingPersonnel,
  onSubmit,
}: PersonnelFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PersonnelFormInputData>({ // Use input type for form
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      name: "",
      role: "Photographer",
      avatar: "",
      status: "Available",
      cameraSerialsInput: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingPersonnel) {
        reset({
          name: editingPersonnel.name,
          role: editingPersonnel.role,
          avatar: editingPersonnel.avatar || "",
          status: editingPersonnel.status,
          cameraSerialsInput: editingPersonnel.cameraSerials?.join(', ') || "",
        });
      } else {
        reset({
          name: "",
          role: "Photographer",
          avatar: "",
          status: "Available",
          cameraSerialsInput: "",
        });
      }
    }
  }, [editingPersonnel, reset, isOpen]);

  const internalOnSubmit: SubmitHandler<PersonnelFormInputData> = (data) => {
    const processedData: PersonnelFormDialogData = {
      ...data,
      cameraSerials: data.cameraSerialsInput
        ? data.cameraSerialsInput.split(',').map(s => s.trim()).filter(s => s !== '')
        : [],
    };
    onSubmit(processedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{editingPersonnel ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
          <DialogDescription>
            {editingPersonnel ? "Update the details for this team member." : "Fill in the details for the new team member."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-4 py-4">
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
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="cameraSerialsInput" className="text-right pt-2">Camera S/Ns</Label>
            <div className="col-span-3">
              <Textarea 
                id="cameraSerialsInput" 
                {...register("cameraSerialsInput")} 
                placeholder="e.g., SN123, SN456 (comma-separated)" 
                className={errors.cameraSerialsInput ? "border-destructive" : ""} 
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">Enter multiple serial numbers separated by commas.</p>
              {errors.cameraSerialsInput && <p className="text-xs text-destructive mt-1">{errors.cameraSerialsInput.message}</p>}
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent">{editingPersonnel ? "Save Changes" : "Add Member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
