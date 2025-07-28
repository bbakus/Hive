
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { PlusCircle, Edit, Trash2, Filter } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useToast } from "../../../hooks/use-toast";
import { useProjectContext, type Project, type KeyPersonnel, type ProjectFormData as ProjectContextFormData } from "../../../contexts/ProjectContext";
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from "../../../contexts/OrganizationContext";
import { useUserContext } from "../../../contexts/UserContext";
import { cn } from "../../../lib/utils";
import { ProjectFormDialog, type ProjectFormDialogData } from "../../../components/modals/ProjectFormDialog";

const PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed", "Cancelled"] as const;

export default function ProjectsPage() {
  const { user, isLoading: isLoadingUser } = useUserContext();
  const { projects: projectsFromContextMaybeArray, updateProject, deleteProject, isLoadingProjects } = useProjectContext();
  const projectsFromContext = Array.isArray(projectsFromContextMaybeArray) ? projectsFromContextMaybeArray : [];
  const { organizations, selectedOrganizationId, isLoadingOrganizations } = useOrganizationContext();
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // User data for access control and filtering based on role and ID
  const currentUserRole = user?.role;
  const currentUserId = user?.id;

  const canCreateProject = currentUserRole === "HIVE" || currentUserRole === "Admin";

  const pageDescription = useMemo(() => {
    const selectedOrgName = organizations.find(o => o.id === selectedOrganizationId)?.name;
    
    if (currentUserRole === "HIVE") {
      if (selectedOrganizationId !== ALL_ORGANIZATIONS_ID && selectedOrgName) {
        return `Global view: Projects for ${selectedOrgName}. Manage all event timelines and project setups.`;
      }
      return "Global view: All projects across all organizations. Manage event timelines and project setups.";
    }
    if (currentUserRole === "Admin") {
       if (selectedOrganizationId !== ALL_ORGANIZATIONS_ID && selectedOrgName) {
        return `Projects for ${selectedOrgName}. Manage event timelines and project setups.`;
      }
      return "All projects you administer across your organizations. Manage event timelines and project setups.";
    }
    if (currentUserRole === "Project Manager") {
      return "Your assigned projects. Manage your event timelines and project setups.";
    }
    if (currentUserRole === "Client") {
      return "Your projects. View status and event timelines.";
    }
    if (currentUserRole === "Photographer" || currentUserRole === "Editor") {
      return "Projects you are involved in. View status and event timelines.";
    }
    if (currentUserRole === "Guest") {
      return "Projects shared with you. View status and event timelines.";
    }
    return "Overview of projects. Manage event timelines and project setups.";
  }, [selectedOrganizationId, organizations, currentUserRole]);

  const displayProjects = useMemo(() => {
    let filtered = [...projectsFromContext]; 

    // Filter by user role and permissions
    if (currentUserRole === "Project Manager" || currentUserRole === "Client" || currentUserRole === "Photographer" || currentUserRole === "Editor" || currentUserRole === "Guest") {
      filtered = filtered.filter(project =>
        project.keyPersonnel?.some(kp => kp.personnelId === currentUserId)
      );
    }
    
    if (filterText) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    return filtered;
  }, [projectsFromContext, filterText, statusFilter, currentUserRole, currentUserId]);

  if (isLoadingProjects || isLoadingOrganizations || isLoadingUser) {
    return <div className="p-4">Loading projects, organizations, and user data...</div>;
  }

  const handleEditProjectSubmit = async (data: ProjectFormDialogData) => {
    if (editingProject) {
      try {
        console.log('Form data received:', data);
        console.log('Original keyPersonnel:', data.keyPersonnel);
        console.log('Selected personnel map:', data.selectedPersonnelMap);
        
        // Don't require projectRole to be present - allow empty roles 
        const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.personnelId && data.selectedPersonnelMap?.[kp.personnelId]) || [];
        console.log('Final keyPersonnel to send:', finalKeyPersonnel);
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { selectedPersonnelMap, ...dataToUpdate } = data; 

        await updateProject(editingProject.id, {...dataToUpdate, keyPersonnel: finalKeyPersonnel });
        
        toast({
          title: "Project Updated",
          description: `"${data.name}" has been successfully updated.`,
        });
        
        setIsEditModalOpen(false);
        setEditingProject(null);
      } catch (error) {
        console.error('Error updating project:', error);
        toast({
          title: "Error",
          description: "Failed to update project. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDeleteId) {
      try {
        const project = projectsFromContext.find(p => p.id === projectToDeleteId);
        await deleteProject(projectToDeleteId);
        toast({
          title: "Project Deleted",
          description: `"${project?.name}" has been deleted.`,
        });
        setIsDeleteDialogOpen(false);
        setProjectToDeleteId(null);
      } catch (error) {
        console.error('Error deleting project:', error);
        toast({
          title: "Error",
          description: "Failed to delete project. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const showActionsForProject = (project: Project): boolean => {
    if (currentUserRole === "HIVE" || currentUserRole === "Admin") return true;
    if (currentUserRole === "Project Manager" && project.keyPersonnel?.some(kp => kp.personnelId === currentUserId)) return true;
    return false;
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        {canCreateProject && (
          <Link
            href="/projects/new"
            className={cn(buttonVariants({ variant: "default" }), "ml-auto")}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-64"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROJECT_STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Directory</CardTitle>
          <CardDescription>
            {displayProjects.length > 0 
              ? `${displayProjects.length} project${displayProjects.length > 1 ? 's' : ''} found. `
              : (currentUserRole === "Project Manager" || currentUserRole === "Client" || currentUserRole === "Photographer" || currentUserRole === "Editor" || currentUserRole === "Guest" ? "Showing your assigned/involved projects. " : "Showing projects for all your organizations. ")
            }
            {filterText ? `Filtered by "${filterText}". ` : ""}
            {statusFilter !== "all" ? `Status: ${statusFilter}. ` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  {(currentUserRole === "HIVE" && selectedOrganizationId === ALL_ORGANIZATIONS_ID) && <TableHead>Organization</TableHead>}
                  <TableHead>Start Date</TableHead>
                  <TableHead>Key Personnel</TableHead>
                  {(currentUserRole === "HIVE" || currentUserRole === "Admin" || currentUserRole === "Project Manager") && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        project.status === "Active" ? "default" :
                        project.status === "Planning" ? "secondary" :
                        project.status === "Completed" ? "outline" : "destructive"
                      }>{project.status}</Badge>
                    </TableCell>
                    {(currentUserRole === "HIVE" && selectedOrganizationId === ALL_ORGANIZATIONS_ID) &&
                      <TableCell>{organizations.find(org => org.id === project.organizationId)?.name || "Unknown"}</TableCell>
                    }
                    <TableCell>{project.startDate || "Not set"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={
                       (project.keyPersonnel && project.keyPersonnel.length > 0)
                         ? project.keyPersonnel.map(kp => `${kp.name} (${kp.projectRole})`).join(', ')
                         : "N/A"
                     }>
                     {(project.keyPersonnel && project.keyPersonnel.length > 0)
                       ? project.keyPersonnel.map(kp => `${kp.name} (${kp.projectRole.substring(0,15)}${kp.projectRole.length > 15 ? '...' : ''})`).join(', ')
                       : "N/A"}
                   </TableCell>
                    {showActionsForProject(project) ? (
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="hover:text-foreground/80" onClick={() => openEditProjectModal(project)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteClick(project.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                        </TableCell>
                    ) : (currentUserRole === "Client" || currentUserRole === "Photographer" || currentUserRole === "Editor" || currentUserRole === "Guest") ? (
                        <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground italic">View Only</span>
                        </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {filterText || statusFilter !== "all" 
                ? "No projects found matching your criteria."
                : currentUserRole === "Project Manager" || currentUserRole === "Client" || currentUserRole === "Photographer" || currentUserRole === "Editor" || currentUserRole === "Guest"
                ? "No projects assigned to you yet."
                : currentUserRole === "Project Manager" || currentUserRole === "Client" || currentUserRole === "Photographer" || currentUserRole === "Editor" || currentUserRole === "Guest"
                ? "No projects available."
                : "No projects created yet. Create your first project to get started."
              }
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectFormDialog
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditProjectSubmit}
        editingProject={editingProject}
        organizations={organizations}
        isLoadingOrganizations={isLoadingOrganizations}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>Delete Project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    