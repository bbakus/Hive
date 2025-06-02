
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
import { Textarea } from "@/components/ui/textarea";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";

const clientGalleryFormSchema = z.object({
  galleryName: z.string().min(3, "Gallery name must be at least 3 characters."),
  clientEmail: z.string().email("Invalid email address."),
  password: z.string().optional(),
  welcomeMessage: z.string().optional(),
});

export type ClientGalleryFormDialogData = z.infer<typeof clientGalleryFormSchema>;

interface ClientGalleryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: ClientGalleryFormDialogData) => void;
  contextName: string; // e.g., Project Name or Deliverable Name
}

export function ClientGalleryFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  contextName,
}: ClientGalleryFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientGalleryFormDialogData>({
    resolver: zodResolver(clientGalleryFormSchema),
    defaultValues: {
      galleryName: "",
      clientEmail: "",
      password: "",
      welcomeMessage: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        galleryName: `${contextName} - Client Gallery`,
        clientEmail: "",
        password: "",
        welcomeMessage: `Welcome to your gallery for ${contextName}!`,
      });
    }
  }, [isOpen, reset, contextName]);

  const internalOnSubmit: SubmitHandler<ClientGalleryFormDialogData> = (data) => {
    onSubmit(data);
    onOpenChange(false); // Close dialog on submit
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Client Gallery</DialogTitle>
          <DialogDescription>
            Prepare a new client-facing gallery for: <span className="font-semibold">{contextName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="galleryName">Gallery Name</Label>
            <Input
              id="galleryName"
              {...register("galleryName")}
              className={errors.galleryName ? "border-destructive" : ""}
            />
            {errors.galleryName && <p className="text-xs text-destructive">{errors.galleryName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">Client Email</Label>
            <Input
              id="clientEmail"
              type="email"
              {...register("clientEmail")}
              className={errors.clientEmail ? "border-destructive" : ""}
            />
            {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="welcomeMessage">Welcome Message (Optional)</Label>
            <Textarea
              id="welcomeMessage"
              {...register("welcomeMessage")}
              rows={3}
              placeholder="Enter a welcome message for your client..."
            />
            {errors.welcomeMessage && <p className="text-xs text-destructive">{errors.welcomeMessage.message}</p>}
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent">
              Create Gallery
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    