
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type Project, type KeyPersonnel, type ProjectFormData as ProjectContextFormData } from "@/contexts/ProjectContext";
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from "@/contexts/OrganizationContext";
import { useUserContext, type UserRole } from "@/contexts/UserContext"; // Import UserContext and UserRole
import { cn } from "@/lib/utils";
import { ProjectFormDialog, type ProjectFormDialogData } from "@/components/modals/ProjectFormDialog";

// Define the possible statuses for projects
const projectStatuses = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;

export default function ProjectsPage() {
  const { user, isLoadingUser } = useUserContext(); // Get user from context
  const { projects: projectsFromContextMaybeArray, updateProject, deleteProject, isLoadingProjects } = useProjectContext();
  const projectsFromContext = Array.isArray(projectsFromContextMaybeArray) ? projectsFromContextMaybeArray : [];

  const { organizations, selectedOrganizationId, isLoadingOrganizations } = useOrganizationContext();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mock user data for access control and filtering based on role and ID
  const MOCK_CURRENT_USER_ROLE = user?.role;
  // Note: In a real application, this would come from an authenticated user session.
  const MOCK_CURRENT_USER_ID = user?.id;

  const canCreateProject = MOCK_CURRENT_USER_ROLE === "HIVE" || MOCK_CURRENT_USER_ROLE === "Admin";

  const pageDescription = useMemo(() => {
    const selectedOrgName = organizations.find(o => o.id === selectedOrganizationId)?.name;
    
    if (MOCK_CURRENT_USER_ROLE === "HIVE") { // HIVE user sees global or org-specific view
      if (selectedOrganizationId !== ALL_ORGANIZATIONS_ID && selectedOrgName) {
        return `Global view: Projects for ${selectedOrgName}. Manage all event timelines and project setups.`;
      }
      return "Global view: All projects across all organizations. Manage event timelines and project setups.";
    }
    if (MOCK_CURRENT_USER_ROLE === "Admin") {
       if (selectedOrganizationId !== ALL_ORGANIZATIONS_ID && selectedOrgName) {
        return `Projects for ${selectedOrgName}. Manage event timelines and project setups.`;
      }
      return "All projects you administer across your organizations. Manage event timelines and project setups.";
    }
    if (MOCK_CURRENT_USER_ROLE === "Project Manager") {
      return "Your assigned projects. Manage your event timelines and project setups.";
    }
    if (MOCK_CURRENT_USER_ROLE === "Client") {
      return "Your projects. View status and event timelines.";
    }
    if (MOCK_CURRENT_USER_ROLE === "Photographer" || MOCK_CURRENT_USER_ROLE === "Editor") {
      return "Projects you are involved in. View status and event timelines.";
    }
    if (MOCK_CURRENT_USER_ROLE === "Guest") { // Guest sees projects shared with them
        return "Projects shared with you. View status and event timelines.";
    }
    return "Overview of projects. Manage event timelines and project setups.";
  }, [selectedOrganizationId, organizations, MOCK_CURRENT_USER_ROLE]);

  const displayProjects = useMemo(() => {
    let filtered = [...projectsFromContext]; 

    if (MOCK_CURRENT_USER_ROLE === "Project Manager" || MOCK_CURRENT_USER_ROLE === "Client" || MOCK_CURRENT_USER_ROLE === "Photographer" || MOCK_CURRENT_USER_ROLE === "Editor" || MOCK_CURRENT_USER_ROLE === "Guest") {
      filtered = filtered.filter(project =>
        project.keyPersonnel?.some(kp => kp.personnelId === MOCK_CURRENT_USER_ID)
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
  }, [projectsFromContext, filterText, statusFilter, MOCK_CURRENT_USER_ROLE, MOCK_CURRENT_USER_ID]);

  if (isLoadingProjects || isLoadingOrganizations || isLoadingUser) {
    return <div className="p-4">Loading projects, organizations, and user data...</div>;
  }

  const handleEditProjectSubmit = (data: ProjectFormDialogData) => {
    if (editingProject) {
      const finalKeyPersonnel = data.keyPersonnel?.filter(kp => kp.personnelId && data.selectedPersonnelMap?.[kp.personnelId] && kp.projectRole) || [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { selectedPersonnelMap, ...dataToUpdate } = data; 

      updateProject(editingProject.id, {...dataToUpdate, keyPersonnel: finalKeyPersonnel });
      toast({
        title: "Project Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    }
    setIsEditModalOpen(false);
    setEditingProject(null);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDeleteId) {
      const project = projectsFromContext.find(p => p.id === projectToDeleteId);
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

  const showActionsForProject = (project: Project): boolean => {
    if (MOCK_CURRENT_USER_ROLE === "HIVE" || MOCK_CURRENT_USER_ROLE === "Admin") return true;
    if (MOCK_CURRENT_USER_ROLE === "Project Manager" && project.keyPersonnel?.some(kp => kp.personnelId === MOCK_CURRENT_USER_ID)) return true;
    return false;
  };


  return (

    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight">Projects</p>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        {canCreateProject && (
          <Button asChild variant="outline" className="px-3 py-2 h-9">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Project (Wizard)
            </Link>
          </Button>
        )}
      </div>

      <ProjectFormDialog
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        editingProject={editingProject}
        onSubmit={handleEditProjectSubmit}
        organizations={organizations}
        isLoadingOrganizations={isLoadingOrganizations}
      />

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
            <AlertDialogAction onClick={confirmDelete} className={cn(buttonVariants({variant: "destructive"}))}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <p className="text-lg font-semibold">Project List</p>
              <div className="text-sm text-muted-foreground">
                {selectedOrganizationId !== ALL_ORGANIZATIONS_ID && organizations.find(o => o.id === selectedOrganizationId)
                  ? `Showing projects for ${organizations.find(o => o.id === selectedOrganizationId)?.name}. `
                  : (MOCK_CURRENT_USER_ROLE === "Project Manager" || MOCK_CURRENT_USER_ROLE === "Client" || MOCK_CURRENT_USER_ROLE === "Photographer" || MOCK_CURRENT_USER_ROLE === "Editor" || MOCK_CURRENT_USER_ROLE === "Guest" ? "Showing your assigned/involved projects. " : "Showing projects for all your organizations. ")
                }
                ({displayProjects.length} projects shown)
              </div>
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
                  {(MOCK_CURRENT_USER_ROLE === "HIVE" && selectedOrganizationId === ALL_ORGANIZATIONS_ID) && <TableHead>Organization</TableHead>}
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Key Personnel</TableHead>
                  {(MOCK_CURRENT_USER_ROLE === "HIVE" || MOCK_CURRENT_USER_ROLE === "Admin" || MOCK_CURRENT_USER_ROLE === "Project Manager") && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    {(MOCK_CURRENT_USER_ROLE === "HIVE" && selectedOrganizationId === ALL_ORGANIZATIONS_ID) &&
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
                    ) : (MOCK_CURRENT_USER_ROLE === "Client" || MOCK_CURRENT_USER_ROLE === "Photographer" || MOCK_CURRENT_USER_ROLE === "Editor" || MOCK_CURRENT_USER_ROLE === "Guest") ? (
                       <TableCell className="text-right"></TableCell>
                    ) : null }
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {filterText || statusFilter !== "all"
                ? `No projects found matching your filters ${
                    MOCK_CURRENT_USER_ROLE === "Project Manager" || MOCK_CURRENT_USER_ROLE === "Client" || MOCK_CURRENT_USER_ROLE === "Photographer" || MOCK_CURRENT_USER_ROLE === "Editor" || MOCK_CURRENT_USER_ROLE === "Guest"
                      ? "among your assigned/involved projects"
                      : selectedOrganizationId !== ALL_ORGANIZATIONS_ID
                      ? `for ${organizations.find(o => o.id === selectedOrganizationId)?.name}`
                      : ""
                  }.`
                : MOCK_CURRENT_USER_ROLE === "Project Manager" || MOCK_CURRENT_USER_ROLE === "Client" || MOCK_CURRENT_USER_ROLE === "Photographer" || MOCK_CURRENT_USER_ROLE === "Editor" || MOCK_CURRENT_USER_ROLE === "Guest"
                ? "You are not assigned to/involved in any projects, or no projects are shared with you."
                : `No projects found ${
                    selectedOrganizationId !== ALL_ORGANIZATIONS_ID
                      ? `for ${organizations.find(o => o.id === selectedOrganizationId)?.name}`
                      : ""
                  }.`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    