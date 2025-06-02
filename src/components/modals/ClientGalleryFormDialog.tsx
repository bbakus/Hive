
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon as CalendarIconLucide } from "lucide-react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const clientGalleryFormSchema = z.object({
  galleryName: z.string().min(3, "Gallery name must be at least 3 characters."),
  clientEmail: z.string().email("Invalid email address."),
  accessType: z.enum(["public", "private", "password"]),
  password: z.string().optional(),
  allowHighResDownload: z.boolean().default(false),
  enableWatermarking: z.boolean().default(false),
  expiresOn: z.date().optional().nullable(),
  welcomeMessage: z.string().optional(),
}).refine(data => {
  if (data.accessType === "password" && (!data.password || data.password.length < 6)) {
    return false;
  }
  return true;
}, {
  message: "Password must be at least 6 characters if access type is 'Password Protected'.",
  path: ["password"],
});

export type ClientGalleryFormDialogData = z.infer<typeof clientGalleryFormSchema>;

export interface ClientGallery extends ClientGalleryFormDialogData {
  id: string;
  deliverableContextName: string; // The name of the deliverable/project it's for
}


interface ClientGalleryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: ClientGalleryFormDialogData) => void;
  contextName: string;
  editingGallery: ClientGallery | null;
}

export function ClientGalleryFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  contextName,
  editingGallery,
}: ClientGalleryFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<ClientGalleryFormDialogData>({
    resolver: zodResolver(clientGalleryFormSchema),
    defaultValues: {
      galleryName: "",
      clientEmail: "",
      accessType: "private",
      password: "",
      allowHighResDownload: true,
      enableWatermarking: false,
      expiresOn: null,
      welcomeMessage: "",
    },
  });

  const watchedAccessType = watch("accessType");

  useEffect(() => {
    if (isOpen) {
      if (editingGallery) {
        reset({
          galleryName: editingGallery.galleryName,
          clientEmail: editingGallery.clientEmail,
          accessType: editingGallery.accessType,
          password: editingGallery.password || "",
          allowHighResDownload: editingGallery.allowHighResDownload,
          enableWatermarking: editingGallery.enableWatermarking,
          expiresOn: editingGallery.expiresOn ? (typeof editingGallery.expiresOn === 'string' ? parseISO(editingGallery.expiresOn) : editingGallery.expiresOn) : null,
          welcomeMessage: editingGallery.welcomeMessage || "",
        });
      } else {
        reset({
          galleryName: `${contextName} - Client Gallery`,
          clientEmail: "",
          accessType: "private",
          password: "",
          allowHighResDownload: true,
          enableWatermarking: false,
          expiresOn: null,
          welcomeMessage: `Welcome to your gallery for ${contextName}!`,
        });
      }
    }
  }, [isOpen, reset, contextName, editingGallery]);

  const internalOnSubmit: SubmitHandler<ClientGalleryFormDialogData> = (data) => {
    onSubmit(data);
    // onOpenChange(false); // Keep dialog open on submit for now to review or make quick changes
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingGallery ? "Edit Client Gallery" : "Create Client Gallery"}</DialogTitle>
          <DialogDescription>
            Configure the gallery for: <span className="font-semibold">{editingGallery ? editingGallery.deliverableContextName : contextName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
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
            <Label htmlFor="accessType">Access Type</Label>
            <Controller
              name="accessType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="accessType" className={errors.accessType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select access type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (Link anyone can view)</SelectItem>
                    <SelectItem value="private">Private (Link only, unlisted)</SelectItem>
                    <SelectItem value="password">Password Protected</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accessType && <p className="text-xs text-destructive">{errors.accessType.message}</p>}
          </div>
          
          {watchedAccessType === "password" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Gallery Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
             <Label htmlFor="expiresOn">Gallery Expires On (Optional)</Label>
              <Controller
                name="expiresOn"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.expiresOn ? "border-destructive" : ""
                        )}
                      >
                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>No Expiry</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            {errors.expiresOn && <p className="text-xs text-destructive">{errors.expiresOn.message}</p>}
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex items-center space-x-2">
              <Controller
                name="allowHighResDownload"
                control={control}
                render={({ field }) => (
                    <Checkbox
                        id="allowHighResDownload"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
              />
              <Label htmlFor="allowHighResDownload" className="font-normal">Allow High-Resolution Download</Label>
            </div>
             <div className="flex items-center space-x-2">
               <Controller
                name="enableWatermarking"
                control={control}
                render={({ field }) => (
                    <Checkbox
                        id="enableWatermarking"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
               />
              <Label htmlFor="enableWatermarking" className="font-normal">Enable Watermarking on Previews</Label>
            </div>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent">
              {editingGallery ? "Save Changes" : "Create Gallery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
