
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link"; 
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Filter, Briefcase } from "lucide-react"; // Added Briefcase
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, type SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type Project, type KeyPersonnel } from "@/contexts/ProjectContext";
import { useOrganizationContext, type Organization, ALL_ORGANIZATIONS_ID } from "@/contexts/OrganizationContext"; // Import
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";


const availablePersonnelListForEdit: { id: string; name: string; capabilities: string[] }[] = [
  { id: "user001", name: "Alice Wonderland", capabilities: ["Director", "Producer", "Lead Camera Op"] },
  { id: "user002", name: "Bob The Builder", capabilities: ["Audio Engineer", "Grip", "Technical Director"] },
  { id: "user003", name: "Charlie Chaplin", capabilities: ["Producer", "Editor", "Writer"] },
  { id: "user004", name: "Diana Prince", capabilities: ["Drone Pilot", "Photographer", "Camera Operator"] },
  { id: "user005", name: "Edward Scissorhands", capabilities: ["Grip", "Set Designer", "Editor"] },
  { id: "user006", name: "Fiona Gallagher", capabilities: ["Coordinator", "Project Manager"] },
  { id: "user007", name: "George Jetson", capabilities: ["Tech Lead", "IT Support", "Streaming Engineer"] },
];

const keyPersonnelEditSchema = z.object({
  personnelId: z.string(),
  name: z.string(),
  projectRole: z.string().min(1, "Role is required").max(50, "Role too long"),
});

const projectEditSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be YYYY-MM-DD." }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be YYYY-MM-DD." }),
  description: z.string().optional(),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold", "Cancelled"]),
  organizationId: z.string().min(1, { message: "Organization is required." }), // Added organizationId
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelEditSchema).optional(),
  selectedPersonnelMap: z.record(z.boolean()).optional(),
});

type ProjectEditFormData = z.infer<typeof projectEditSchema>;
const projectStatuses = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;


export default function ProjectsPage() {
  const { projects, updateProject, deleteProject, isLoadingProjects } = useProjectContext();
  const { organizations, selectedOrganizationId, isLoadingOrganizations } = useOrganizationContext();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEditForm,
    control: controlEdit,
    setValue: setEditValue,
    watch: watchEdit,
    getValues, // Added getValues here
    formState: { errors: editErrors },
  } = useForm<ProjectEditFormData>({
    resolver: zodResolver(projectEditSchema),
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

  const { fields: keyPersonnelFields, append: appendKeyPersonnel, remove: removeKeyPersonnel, replace: replaceKeyPersonnel } = useFieldArray({
    control: controlEdit,
    name: "keyPersonnel",
  });

  const selectedPersonnelMapEdit = watchEdit("selectedPersonnelMap");

  useEffect(() => {
    if (editingProject && isEditModalOpen) {
      const initialSelectedMap: Record<string, boolean> = {};
      editingProject.keyPersonnel?.forEach(kp => {
        initialSelectedMap[kp.personnelId] = true;
      });
      resetEditForm({
        name: editingProject.name,
        startDate: editingProject.startDate || "",
        endDate: editingProject.endDate || "",
        description: editingProject.description || "",
        status: editingProject.status as ProjectEditFormData['status'] || "Planning",
        organizationId: editingProject.organizationId,
        location: editingProject.location || "",
        keyPersonnel: editingProject.keyPersonnel || [],
        selectedPersonnelMap: initialSelectedMap,
      });
    }
  }, [editingProject, isEditModalOpen, resetEditForm]);

  useEffect(() => {
    if (!isEditModalOpen || !selectedPersonnelMapEdit) return;

    const currentKeyPersonnelValues = getValues("keyPersonnel") || [];
    const newKeyPersonnelArray: KeyPersonnel[] = [];
    
    availablePersonnelListForEdit.forEach(person => {
        if (selectedPersonnelMapEdit[person.id]) {
            const existingEntry = currentKeyPersonnelValues.find(kp => kp.personnelId === person.id);
            newKeyPersonnelArray.push({
                personnelId: person.id,
                name: person.name,
                projectRole: existingEntry?.projectRole || "", 
            });
        }
    });
    
    const currentKpString = JSON.stringify(currentKeyPersonnelValues.map(k=>({p:k.personnelId, r:k.projectRole})).sort((a,b)=>a.p.localeCompare(b.p)));
    const newKpString = JSON.stringify(newKeyPersonnelArray.map(k=>({p:k.personnelId, r:k.projectRole})).sort((a,b)=>a.p.localeCompare(b.p)));

    if (newKpString !== currentKpString) {
        setEditValue("keyPersonnel", newKeyPersonnelArray, { shouldValidate: true, shouldDirty: true });
    }

  }, [selectedPersonnelMapEdit, isEditModalOpen, setEditValue, getValues]);


  const handleEditProjectSubmit: SubmitHandler<ProjectEditFormData> = (data) => {
    if (editingProject) {
      const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.personnelId && selectedPersonnelMapEdit?.[kp.personnelId] && kp.projectRole) || [];
      const { selectedPersonnelMap, ...dataToUpdate } = data;

      updateProject(editingProject.id, {...dataToUpdate, keyPersonnel: finalKeyPersonnel });
      toast({
        title: "Project Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    }
    closeEditModal();
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
    resetEditForm({ // Reset to default or empty values explicitly
      name: "", startDate: "", endDate: "", description: "", status: "Planning", 
      organizationId: "", location: "", keyPersonnel: [], selectedPersonnelMap: {}
    });
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDeleteId) {
      const project = projects.find(p => p.id === projectToDeleteId);
      deleteProject(projectToDeleteId);
      toast({
        title: "Project Deleted",
        description: `Project "${project?.name}" has been deleted.`,
        variant: "destructive",
      });
      setProjectToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
  };
  
  const displayProjects = useMemo(() => {
    let filtered = projects; // projects from context are already filtered by selectedOrganizationId
    if (filterText) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    return filtered;
  }, [projects, filterText, statusFilter]);


  if (isLoadingProjects || isLoadingOrganizations) {
    return <div className="p-4">Loading projects and organizations...</div>;
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {selectedOrganizationId !== ALL_ORGANIZATIONS_ID && organizations.find(o => o.id === selectedOrganizationId) 
              ? `Projects for ${organizations.find(o => o.id === selectedOrganizationId)?.name}. ` 
              : "All projects across your organizations. "}
            Manage your event timelines and project setups.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Project (Wizard)
          </Link>
        </Button>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) closeEditModal(); else setIsEditModalOpen(true);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project: {editingProject?.name}</DialogTitle>
            <DialogDescription>
              Update the details for this project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEditProjectSubmit)} className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right col-span-1">Name</Label>
                  <div className="col-span-3">
                    <Input id="edit-name" {...registerEdit("name")} className={editErrors.name ? "border-destructive" : ""} />
                    {editErrors.name && <p className="text-xs text-destructive mt-1">{editErrors.name.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-organizationId" className="text-right col-span-1">Organization</Label>
                  <div className="col-span-3">
                     <Controller
                      name="organizationId"
                      control={controlEdit}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOrganizations}>
                          <SelectTrigger className={editErrors.organizationId ? "border-destructive" : ""}>
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
                    {editErrors.organizationId && <p className="text-xs text-destructive mt-1">{editErrors.organizationId.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-startDate" className="text-right col-span-1">Start Date</Label>
                  <div className="col-span-3">
                    <Input id="edit-startDate" type="date" {...registerEdit("startDate")} className={editErrors.startDate ? "border-destructive" : ""} />
                    {editErrors.startDate && <p className="text-xs text-destructive mt-1">{editErrors.startDate.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-endDate" className="text-right col-span-1">End Date</Label>
                  <div className="col-span-3">
                    <Input id="edit-endDate" type="date" {...registerEdit("endDate")} className={editErrors.endDate ? "border-destructive" : ""} />
                    {editErrors.endDate && <p className="text-xs text-destructive mt-1">{editErrors.endDate.message}</p>}
                  </div>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-location" className="text-right col-span-1">Location</Label>
                  <div className="col-span-3">
                    <Input id="edit-location" {...registerEdit("location")} className={editErrors.location ? "border-destructive" : ""} />
                    {editErrors.location && <p className="text-xs text-destructive mt-1">{editErrors.location.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-status" className="text-right col-span-1">Status</Label>
                  <div className="col-span-3">
                    <Controller
                      name="status"
                      control={controlEdit}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={editErrors.status ? "border-destructive" : ""}>
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
                    {editErrors.status && <p className="text-xs text-destructive mt-1">{editErrors.status.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-description" className="text-right col-span-1 pt-2">Description</Label>
                  <div className="col-span-3">
                    <Textarea id="edit-description" {...registerEdit("description")} rows={3} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                  <Label>Key Personnel & Roles</Label>
                  <ScrollArea className="h-40 w-full rounded-md border p-2 mb-2">
                      {availablePersonnelListForEdit.map((person) => (
                        <div key={`edit-person-select-${person.id}`} className="flex items-center space-x-2 mb-1 py-1">
                          <Checkbox
                            id={`edit-person-select-${person.id}`}
                            checked={!!selectedPersonnelMapEdit?.[person.id]}
                            onCheckedChange={(checked) => {
                              setEditValue(`selectedPersonnelMap.${person.id}`, !!checked, { shouldValidate: true, shouldDirty: true });
                            }}
                          />
                          <Label htmlFor={`edit-person-select-${person.id}`} className="font-normal text-sm">{person.name}</Label>
                        </div>
                      ))}
                  </ScrollArea>
                  <ScrollArea className="h-48 w-full space-y-2.5 border p-2 rounded-md">
                      {keyPersonnelFields.map((field, index) => {
                        const personDetails = availablePersonnelListForEdit.find(p => p.id === field.personnelId);
                        return selectedPersonnelMapEdit?.[field.personnelId] && personDetails && (
                          <div key={field.id} className="grid grid-cols-5 items-center gap-2">
                            <Label htmlFor={`edit-keyPersonnel.${index}.projectRole`} className="col-span-2 text-xs truncate" title={field.name}>
                              {field.name}
                            </Label>
                            <div className="col-span-3">
                               <Controller
                                name={`keyPersonnel.${index}.projectRole`}
                                control={controlEdit}
                                render={({ field: selectField }) => (
                                  <Select onValueChange={selectField.onChange} value={selectField.value || ""}>
                                    <SelectTrigger className={`h-8 text-xs ${editErrors.keyPersonnel?.[index]?.projectRole ? "border-destructive" : ""}`}>
                                      <SelectValue placeholder="Select role..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {personDetails.capabilities.map(cap => (
                                        <SelectItem key={`${personDetails.id}-${cap}`} value={cap}>{cap}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {editErrors.keyPersonnel?.[index]?.projectRole && (
                                <p className="text-xs text-destructive mt-0.5">{editErrors.keyPersonnel?.[index]?.projectRole?.message}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </ScrollArea>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={closeEditModal}>Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={cn(buttonVariants({variant: "destructive"}))}>Delete Project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle>Project List</CardTitle>
              <CardDescription>
                {selectedOrganizationId !== ALL_ORGANIZATIONS_ID && organizations.find(o => o.id === selectedOrganizationId) 
                  ? `Showing projects for ${organizations.find(o => o.id === selectedOrganizationId)?.name}. ` 
                  : "Showing projects for all your organizations. "}
                ({displayProjects.length} projects shown)
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Filter by name..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="pl-10"
                />
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {projectStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  {selectedOrganizationId === ALL_ORGANIZATIONS_ID && <TableHead>Organization</TableHead>}
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Key Personnel</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    {selectedOrganizationId === ALL_ORGANIZATIONS_ID && 
                      <TableCell className="text-xs text-muted-foreground">
                        {organizations.find(o => o.id === project.organizationId)?.name || "N/A"}
                      </TableCell>
                    }
                    <TableCell className="text-xs text-muted-foreground">
                        {project.location || "N/A"}
                    </TableCell>
                    <TableCell className="text-xs">
                        {project.startDate} to {project.endDate}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        project.status === "In Progress" ? "secondary" :
                        project.status === "Planning" ? "outline" :
                        project.status === "Completed" ? "default" :
                        project.status === "On Hold" ? "outline" :
                        project.status === "Cancelled" ? "destructive" :
                        "destructive" 
                      }>{project.status}</Badge>
                    </TableCell>
                     <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={
                        (project.keyPersonnel && project.keyPersonnel.length > 0)
                          ? project.keyPersonnel.map(kp => `${kp.name} (${kp.projectRole})`).join(', ')
                          : "N/A"
                      }>
                      {(project.keyPersonnel && project.keyPersonnel.length > 0)
                        ? project.keyPersonnel.map(kp => `${kp.name} (${kp.projectRole.substring(0,15)}${kp.projectRole.length > 15 ? '...' : ''})`).join(', ')
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent" onClick={() => openEditProjectModal(project)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteClick(project.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {filterText || statusFilter !== "all" 
                ? `No projects found matching your filters ${selectedOrganizationId !== ALL_ORGANIZATIONS_ID ? `for ${organizations.find(o => o.id === selectedOrganizationId)?.name}` : ''}.` 
                : `No projects found ${selectedOrganizationId !== ALL_ORGANIZATIONS_ID ? `for ${organizations.find(o => o.id === selectedOrganizationId)?.name}` : ''}. Click "Add New Project (Wizard)" to get started.`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

