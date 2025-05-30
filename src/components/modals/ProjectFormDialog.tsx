
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, type SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Project, KeyPersonnel, ProjectFormData } from "@/contexts/ProjectContext";
import type { Organization } from "@/contexts/OrganizationContext";
import { useEffect } from "react";
import { initialPersonnelMock } from "@/app/(app)/personnel/page"; // Using this as the source of available personnel

const keyPersonnelEditSchema = z.object({
  personnelId: z.string(),
  name: z.string(),
  projectRole: z.string().min(1, "Role is required").max(50, "Role too long"),
});

export const projectFormSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be YYYY-MM-DD." }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be YYYY-MM-DD." }),
  description: z.string().optional(),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold", "Cancelled"]),
  organizationId: z.string().min(1, { message: "Organization is required." }),
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelEditSchema).optional(),
  selectedPersonnelMap: z.record(z.boolean()).optional(),
});

export type ProjectFormDialogData = z.infer<typeof projectFormSchema>;

const projectStatuses = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;

interface ProjectFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingProject: Project | null;
  onSubmit: (data: ProjectFormDialogData) => void;
  organizations: Organization[];
  isLoadingOrganizations: boolean;
}

// Adapt initialPersonnelMock to WizardAvailablePersonnel structure for consistency
const availablePersonnelListForEdit: { id: string; name: string; capabilities: string[] }[] = 
  initialPersonnelMock.map(p => ({
    id: p.id,
    name: p.name,
    capabilities: [p.role] // Simplified for this context, or use actual PHOTOGRAPHY_ROLES if defined
  }));


export function ProjectFormDialog({
  isOpen,
  onOpenChange,
  editingProject,
  onSubmit,
  organizations,
  isLoadingOrganizations
}: ProjectFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormDialogData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      description: "",
      status: "Planning",
      organizationId: "",
      location: "",
      keyPersonnel: [],
      selectedPersonnelMap: {},
    }
  });

  const { fields: keyPersonnelFields } = useFieldArray({
    control,
    name: "keyPersonnel",
    keyName: "fieldId"
  });

  const selectedPersonnelMapEdit = watch("selectedPersonnelMap", {});

  useEffect(() => {
    if (editingProject && isOpen) {
      const initialSelectedMap: Record<string, boolean> = {};
      (editingProject.keyPersonnel || []).forEach(kp => {
        initialSelectedMap[kp.personnelId] = true;
      });
      reset({
        name: editingProject.name,
        startDate: editingProject.startDate || "",
        endDate: editingProject.endDate || "",
        description: editingProject.description || "",
        status: editingProject.status as ProjectFormDialogData['status'] || "Planning",
        organizationId: editingProject.organizationId,
        location: editingProject.location || "",
        keyPersonnel: editingProject.keyPersonnel || [],
        selectedPersonnelMap: initialSelectedMap,
      });
    } else if (!editingProject && isOpen) {
        reset({ 
            name: "", startDate: new Date().toISOString().split('T')[0], 
            endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], 
            description: "", status: "Planning", 
            organizationId: organizations.length > 0 ? organizations[0].id : "", 
            location: "", keyPersonnel: [], selectedPersonnelMap: {}
          });
    }
  }, [editingProject, isOpen, reset, organizations]);

  useEffect(() => {
    if (!isOpen || !selectedPersonnelMapEdit) return;

    const currentKeyPersonnelValues = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];
    let changed = false;
    
    availablePersonnelListForEdit.forEach(person => {
        if (selectedPersonnelMapEdit[person.id]) {
            const existingEntry = currentKeyPersonnelValues.find(kp => kp.personnelId === person.id);
            newKeyPersonnelArray.push({
                personnelId: person.id,
                name: person.name,
                projectRole: existingEntry?.projectRole || "", 
            });
             if (!existingEntry) changed = true; // New person added
        }
    });
    
    // Check if array length or content changed
    if (newKeyPersonnelArray.length !== currentKeyPersonnelValues.length) {
        changed = true;
    } else {
      for(let i = 0; i < newKeyPersonnelArray.length; i++) {
        if(newKeyPersonnelArray[i].personnelId !== currentKeyPersonnelValues[i].personnelId ||
           newKeyPersonnelArray[i].projectRole !== currentKeyPersonnelValues[i].projectRole) {
          changed = true;
          break;
        }
      }
    }
    
    if (changed) {
        setValue("keyPersonnel", newKeyPersonnelArray.sort((a,b) => a.personnelId.localeCompare(b.personnelId)), { shouldValidate: true, shouldDirty: true });
    }

  }, [selectedPersonnelMapEdit, isOpen, setValue, getValues]);

  const internalOnSubmit: SubmitHandler<ProjectFormDialogData> = (data) => {
    onSubmit(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingProject ? `Edit Project: ${editingProject.name}` : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {editingProject ? "Update the details for this project." : "Fill in the details for the new project."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(internalOnSubmit)} className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right col-span-1">Name</Label>
                <div className="col-span-3">
                  <Input id="edit-name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-organizationId" className="text-right col-span-1">Organization</Label>
                <div className="col-span-3">
                   <Controller
                    name="organizationId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOrganizations}>
                        <SelectTrigger className={errors.organizationId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.organizationId && <p className="text-xs text-destructive mt-1">{errors.organizationId.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-startDate" className="text-right col-span-1">Start Date</Label>
                <div className="col-span-3">
                  <Input id="edit-startDate" type="date" {...register("startDate")} className={errors.startDate ? "border-destructive" : ""} />
                  {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-endDate" className="text-right col-span-1">End Date</Label>
                <div className="col-span-3">
                  <Input id="edit-endDate" type="date" {...register("endDate")} className={errors.endDate ? "border-destructive" : ""} />
                  {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>}
                </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-location" className="text-right col-span-1">Location</Label>
                <div className="col-span-3">
                  <Input id="edit-location" {...register("location")} className={errors.location ? "border-destructive" : ""} />
                  {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right col-span-1">Status</Label>
                <div className="col-span-3">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-description" className="text-right col-span-1 pt-2">Description</Label>
                <div className="col-span-3">
                  <Textarea id="edit-description" {...register("description")} rows={3} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
                <Label>Key Personnel & Roles</Label>
                <ScrollArea className="h-40 w-full rounded-none border p-2 mb-2">
                    {availablePersonnelListForEdit.map((person) => (
                      <div key={`edit-person-select-${person.id}`} className="flex items-center space-x-2 mb-1 py-1">
                        <Checkbox
                          id={`edit-project-person-select-${person.id}`}
                          checked={!!selectedPersonnelMapEdit?.[person.id]}
                          onCheckedChange={(checked) => {
                            setValue(`selectedPersonnelMap.${person.id}`, !!checked, { shouldValidate: true, shouldDirty: true });
                          }}
                        />
                        <Label htmlFor={`edit-project-person-select-${person.id}`} className="font-normal text-sm">{person.name}</Label>
                      </div>
                    ))}
                </ScrollArea>
                <ScrollArea className="h-48 w-full space-y-2.5 border p-2 rounded-none">
                    {keyPersonnelFields.map((kpField, index) => {
                      const personDetails = availablePersonnelListForEdit.find(p => p.id === kpField.personnelId);
                      return personDetails && (
                        <div key={kpField.fieldId} className="grid grid-cols-5 items-center gap-2">
                          <Label htmlFor={`edit-keyPersonnel.${index}.projectRole`} className="col-span-2 text-xs truncate" title={kpField.name}>
                            {kpField.name}
                          </Label>
                          <div className="col-span-3">
                             <Controller
                              name={`keyPersonnel.${index}.projectRole`}
                              control={control}
                              defaultValue={kpField.projectRole || ""}
                              render={({ field: selectField }) => (
                                <Select onValueChange={selectField.onChange} value={selectField.value || ""}>
                                  <SelectTrigger className={`h-8 text-xs ${errors.keyPersonnel?.[index]?.projectRole ? "border-destructive" : ""}`}>
                                    <SelectValue placeholder="Select role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {personDetails.capabilities.map(cap => (
                                      <SelectItem key={`${personDetails.id}-${cap}`} value={cap}>{cap}</SelectItem>
                                    ))}
                                    {personDetails.capabilities.length === 0 && <SelectItem value="" disabled>No capabilities</SelectItem>}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.keyPersonnel?.[index]?.projectRole && (
                              <p className="text-xs text-destructive mt-0.5">{errors.keyPersonnel?.[index]?.projectRole?.message}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                     {keyPersonnelFields.length === 0 && <p className="text-center text-xs text-muted-foreground py-2">Select personnel to assign roles.</p>}
                </ScrollArea>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent">{editingProject ? "Save Changes" : "Add Project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
