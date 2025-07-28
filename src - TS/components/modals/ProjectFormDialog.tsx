
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
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";
import { useForm, type SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Project, KeyPersonnel, ProjectFormData } from "../../contexts/ProjectContext";
import type { Organization } from "../../contexts/OrganizationContext";
import { useEffect, useMemo } from "react";
import { usePersonnelContext, type Personnel } from "../../contexts/PersonnelContext"; // Import context
import { PROJECT_ROLES } from "../../lib/constants";

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

export function ProjectFormDialog({
  isOpen,
  onOpenChange,
  editingProject,
  onSubmit,
  organizations,
  isLoadingOrganizations
}: ProjectFormDialogProps) {
  const { personnelList, isLoadingPersonnel } = usePersonnelContext(); // Get personnel from context

  const availablePersonnelListForEdit = useMemo(() => {
    if (isLoadingPersonnel) return [];
    return personnelList.map(p => ({
      id: p.personnelId, // Use personnelId for consistency
      name: p.name,
      capabilities: PROJECT_ROLES // Use predefined project roles instead of personnel.role
    }));
  }, [personnelList, isLoadingPersonnel]);

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

  // Fix the auto-selection issue by only updating when personnel are individually selected/deselected
  useEffect(() => {
    console.log('useEffect triggered:', { isOpen, selectedPersonnelMapEdit, isLoadingPersonnel, availablePersonnelCount: availablePersonnelListForEdit.length });
    
    if (!isOpen || !selectedPersonnelMapEdit || isLoadingPersonnel) return;

    const currentKeyPersonnelValues = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];

    availablePersonnelListForEdit.forEach(person => {
        if (selectedPersonnelMapEdit[person.id]) {
            console.log('Adding personnel to keyPersonnel array:', person.name);
            const existingEntry = currentKeyPersonnelValues.find(kp => kp.personnelId === person.id);
            newKeyPersonnelArray.push({
                personnelId: person.id,
                name: person.name,
                projectRole: existingEntry?.projectRole || "", // Keep existing role
            });
        }
    });

    console.log('New keyPersonnel array:', newKeyPersonnelArray);

    // Only update if the selection actually changed
    const currentSelectedIds = currentKeyPersonnelValues.map(kp => kp.personnelId).sort();
    const newSelectedIds = newKeyPersonnelArray.map(kp => kp.personnelId).sort();
    
    console.log('Comparing IDs:', { currentSelectedIds, newSelectedIds });
    
    if (JSON.stringify(currentSelectedIds) !== JSON.stringify(newSelectedIds)) {
        console.log('Updating keyPersonnel field');
        setValue("keyPersonnel", newKeyPersonnelArray.sort((a,b) => a.personnelId.localeCompare(b.personnelId)), { shouldValidate: true, shouldDirty: true });
    } else {
        console.log('No change in selection, not updating');
    }

  }, [selectedPersonnelMapEdit, isOpen, setValue, getValues, availablePersonnelListForEdit, isLoadingPersonnel]);

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
                <Label htmlFor="edit-organizationId" className="text-right col-span-1">Organization</Label>
                <div className="col-span-3">
                  <Controller
                    name="organizationId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOrganizations}>
                        <SelectTrigger className={errors.organizationId ? "border-destructive" : ""}>
                          <SelectValue placeholder={isLoadingOrganizations ? "Loading organizations..." : "Select organization"} />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map(org => (
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
                    {isLoadingPersonnel && <p className="text-xs text-muted-foreground">Loading personnel...</p>}
                    {!isLoadingPersonnel && availablePersonnelListForEdit.length === 0 && <p className="text-xs text-muted-foreground">No personnel available.</p>}
                </ScrollArea>
                <Label className="text-sm font-medium">Selected Personnel & Roles:</Label>
                <ScrollArea className="h-48 w-full space-y-2.5 border p-2 rounded-none">
                    {keyPersonnelFields.map((kpField, index) => {
                      const personDetails = availablePersonnelListForEdit.find(p => p.id === kpField.personnelId);
                      return personDetails && (
                        <div key={kpField.fieldId} className="grid grid-cols-5 items-center gap-2 p-2 bg-muted/30 rounded">
                          <Label htmlFor={`edit-keyPersonnel.${index}.projectRole`} className="col-span-2 text-xs truncate font-medium" title={kpField.name}>
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
                                    {PROJECT_ROLES.map(role => (
                                      <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
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
                     {keyPersonnelFields.length === 0 && <p className="text-center text-xs text-muted-foreground py-2">Select personnel above to assign roles.</p>}
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

    