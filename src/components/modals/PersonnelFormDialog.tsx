
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import type { Personnel, PHOTOGRAPHY_ROLES } from "@/app/(app)/personnel/page";

export const personnelFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }) as z.ZodType<typeof PHOTOGRAPHY_ROLES[number]>,
  avatar: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  status: z.enum(["Available", "Assigned", "On Leave"]),
  cameraSerial: z.string().optional(),
});

export type PersonnelFormDialogData = z.infer<typeof personnelFormSchema>;

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
  } = useForm<PersonnelFormDialogData>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      name: "",
      role: "Photographer",
      avatar: "",
      status: "Available",
      cameraSerial: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingPersonnel) {
        reset(editingPersonnel);
      } else {
        reset({
          name: "",
          role: "Photographer",
          avatar: "",
          status: "Available",
          cameraSerial: "",
        });
      }
    }
  }, [editingPersonnel, reset, isOpen]);

  const internalOnSubmit: SubmitHandler<PersonnelFormDialogData> = (data) => {
    onSubmit(data);
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cameraSerial" className="text-right">Camera S/N</Label>
            <div className="col-span-3">
              <Input id="cameraSerial" {...register("cameraSerial")} placeholder="Optional camera serial number" className={errors.cameraSerial ? "border-destructive" : ""} />
              {errors.cameraSerial && <p className="text-xs text-destructive mt-1">{errors.cameraSerial.message}</p>}
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
            <Button type="submit">{editingPersonnel ? "Save Changes" : "Add Member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    