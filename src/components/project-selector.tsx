
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

export function ProjectSelector() {
  const { selectedProjectId, setSelectedProjectId, projects, isLoadingProjects } = useProjectContext();

  return (
    <div className="flex items-center gap-2">
      <FolderKanban className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedProjectId || ""} // If null, use "" for placeholder making SelectValue show placeholder
        onValueChange={(value) => {
          // The value will always be a project ID since "all" is removed
          // or "" if the placeholder somehow becomes selectable (though it shouldn't with items)
          if (value) { // Ensure a valid project ID is passed
            setSelectedProjectId(value);
          }
        }}
        disabled={isLoadingProjects || projects.length === 0}
      >
        <SelectTrigger className="w-[200px] md:w-[280px] h-9">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {/* "All Projects" option is removed */}
          {projects.map((project: Project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
          {projects.length === 0 && !isLoadingProjects && (
            <p className="p-2 text-xs text-muted-foreground text-center">No projects available.</p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
