
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
  const { selectedProjectId, setSelectedProjectId, projects } = useProjectContext();

  return (
    <div className="flex items-center gap-2">
      <FolderKanban className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedProjectId || "all"}
        onValueChange={(value) => {
          setSelectedProjectId(value === "all" ? null : value);
        }}
      >
        <SelectTrigger className="w-[200px] md:w-[280px] h-9">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project: Project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
