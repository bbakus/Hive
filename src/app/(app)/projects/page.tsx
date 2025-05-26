
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link"; // Import Link
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Filter } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

// Mock available personnel for the edit modal (similar to wizard)
// TODO: In a multi-tenant app, this list should be fetched for the current user's organization.
const availablePersonnelListForEdit = [
  { id: "user001", name: "Alice Wonderland" },
  { id: "user002", name: "Bob The Builder" },
  { id: "user003", name: "Charlie Chaplin" },
  { id: "user004", name: "Diana Prince" },
  { id: "user005", name: "Edward Scissorhands" },
  { id: "user006", name: "Fiona Gallagher" },
  { id: "user007", name: "George Jetson" },
];

const keyPersonnelEditSchema = z.object({
  personnelId: z.string(),
  name: z.string(),
  projectRole: z.string().min(1, "Role is required if personnel is selected.").max(50, "Role too long"),
});

const projectEditSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be YYYY-MM-DD." }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be YYYY-MM-DD." }),
  description: z.string().optional(),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold", "Cancelled"]),
  location: z.string().optional(),
  keyPersonnel: z.array(keyPersonnelEditSchema).optional(),
  selectedPersonnelMap: z.record(z.boolean()).optional(), // For managing selections in edit form
});

type ProjectEditFormData = z.infer<typeof projectEditSchema>;
const projectStatuses = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;


export default function ProjectsPage() {
  // TODO: In a multi-tenant app, filter projects by current user's organizationId.
  const { projects, updateProject, deleteProject, isLoadingProjects } = useProjectContext();
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
    formState: { errors: editErrors },
  } = useForm<ProjectEditFormData>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      description: "",
      status: "Planning",
      location: "",
      keyPersonnel: [],
      selectedPersonnelMap: {},
    }
  });

  const { fields: keyPersonnelFields, append: appendKeyPersonnel, remove: removeKeyPersonnel } = useFieldArray({
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
        location: editingProject.location || "",
        keyPersonnel: editingProject.keyPersonnel || [],
        selectedPersonnelMap: initialSelectedMap,
      });
    } else if (!isEditModalOpen) {
        resetEditForm({
            name: "",
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
            description: "",
            status: "Planning",
            location: "",
            keyPersonnel: [],
            selectedPersonnelMap: {},
      });
    }
  }, [editingProject, isEditModalOpen, resetEditForm]);

  useEffect(() => {
    if (!selectedPersonnelMapEdit || !isEditModalOpen) return;

    const currentKeyPersonnelIds = keyPersonnelFields.map(f => f.personnelId);

    availablePersonnelListForEdit.forEach(person => {
      if (selectedPersonnelMapEdit[person.id] && !currentKeyPersonnelIds.includes(person.id)) {
        appendKeyPersonnel({ personnelId: person.id, name: person.name, projectRole: "" });
      }
    });

    const personnelToRemoveIndices: number[] = [];
    keyPersonnelFields.forEach((field, index) => {
      if (!selectedPersonnelMapEdit[field.personnelId]) {
        personnelToRemoveIndices.push(index);
      }
    });
    for (let i = personnelToRemoveIndices.length - 1; i >= 0; i--) {
      removeKeyPersonnel(personnelToRemoveIndices[i]);
    }
  }, [selectedPersonnelMapEdit, keyPersonnelFields, appendKeyPersonnel, removeKeyPersonnel, isEditModalOpen]);


  const handleEditProjectSubmit: SubmitHandler<ProjectEditFormData> = (data) => {
    if (editingProject) {
      const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.personnelId && selectedPersonnelMapEdit?.[kp.personnelId] && kp.projectRole) || [];
      const { selectedPersonnelMap, ...dataToUpdate } = data;

      updateProject(editingProject.id, {...dataToUpdate, keyPersonnel: finalKeyPersonnel});
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
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDeleteId) {
      // TODO: In a real app, check if user has permission to delete this project within their organization.
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
    // TODO: In a real multi-tenant app, filter projects by current user's organizationId.
    // const userOrganizationId = "org_default_demo"; // Get this from user context
    // const orgProjects = projects.filter(p => p.organizationId === userOrganizationId);
    // return orgProjects;
    let filtered = projects;
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


  if (isLoadingProjects) {
    return <div className="p-4">Loading projects...</div>;
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your event timelines and project setups.</p>
          {/* TODO: Add a note here if showing projects for a specific organization */}
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
            <DialogTitle>Edit Project</DialogTitle>
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
                  <ScrollArea className="h-32 w-full rounded-md border p-2 mb-2">
                      {availablePersonnelListForEdit.map((person) => (
                        <div key={`edit-person-select-${person.id}`} className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`edit-person-select-${person.id}`}
                            checked={!!selectedPersonnelMapEdit?.[person.id]}
                            onCheckedChange={(checked) => {
                              setEditValue(`selectedPersonnelMap.${person.id}`, !!checked, { shouldValidate: true });
                            }}
                          />
                          <Label htmlFor={`edit-person-select-${person.id}`} className="font-normal">{person.name}</Label>
                        </div>
                      ))}
                  </ScrollArea>
                  <ScrollArea className="h-40 w-full space-y-2 border p-2 rounded-md">
                      {keyPersonnelFields.map((field, index) => (
                        selectedPersonnelMapEdit?.[field.personnelId] && (
                          <div key={field.id} className="grid grid-cols-5 items-center gap-2">
                            <Label htmlFor={`edit-keyPersonnel.${index}.projectRole`} className="col-span-2 text-xs truncate" title={field.name}>
                              {field.name}
                            </Label>
                            <div className="col-span-3">
                              <Input
                                id={`edit-keyPersonnel.${index}.projectRole`}
                                placeholder="Role"
                                {...registerEdit(`keyPersonnel.${index}.projectRole`)}
                                className={`h-8 text-xs ${editErrors.keyPersonnel?.[index]?.projectRole ? "border-destructive" : ""}`}
                              />
                              {editErrors.keyPersonnel?.[index]?.projectRole && (
                                <p className="text-xs text-destructive mt-0.5">{editErrors.keyPersonnel?.[index]?.projectRole?.message}</p>
                              )}
                            </div>
                          </div>
                        )
                      ))}
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={cn(buttonVariants({variant: "destructive"}))}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle>Project List</CardTitle>
              <CardDescription>Overview of all registered projects. ({displayProjects.length} of {projects.length} projects shown)</CardDescription>
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
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Key Personnel</TableHead>
                  {/* TODO: In a multi-tenant app, you might show Organization if an admin views multiple orgs */}
                  {/* <TableHead>Organization</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
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
                        "destructive" // Fallback, should ideally not happen
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
                    {/* <TableCell className="text-xs text-muted-foreground">{project.organizationId}</TableCell> */}
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
              {filterText || statusFilter !== "all" ? `No projects found matching your filters.` : "No projects found. Click \"Add New Project (Wizard)\" to get started."}
              {/* TODO: Adjust message if filtered by organization: "No projects found for your organization." */}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    