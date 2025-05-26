
"use client";

import { useProjectContext, type Project } from "@/contexts/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban } from "lucide-react";
import { useOrganizationContext } from "@/contexts/OrganizationContext"; // To know when org changes

export function ProjectSelector() {
  const { selectedProjectId, setSelectedProjectId, projects, isLoadingProjects } = useProjectContext();
  const { selectedOrganizationId, isLoadingOrganizations } = useOrganizationContext(); // Get selected org ID

  return (
    <div className="flex items-center gap-2">
      <FolderKanban className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedProjectId || ""} 
        onValueChange={(value) => {
          if (value) { 
            setSelectedProjectId(value);
          }
        }}
        disabled={isLoadingProjects || isLoadingOrganizations || projects.length === 0}
        key={selectedOrganizationId} // Add key to force re-render if organization changes, ensuring value resets correctly
      >
        <SelectTrigger className="w-[200px] md:w-[280px] h-9">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project: Project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
          {projects.length === 0 && !isLoadingProjects && !isLoadingOrganizations && (
            <p className="p-2 text-xs text-muted-foreground text-center">
              {selectedOrganizationId ? "No projects for this organization." : "No projects available."}
            </p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
