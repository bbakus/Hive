
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';

// Define project structure based on existing mock data
export type Project = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  description?: string;
};

type ProjectContextType = {
  selectedProjectId: string | null; // null means "All Projects"
  setSelectedProjectId: (projectId: string | null) => void;
  projects: Project[]; // List of all available projects
  selectedProject: Project | null; // The full selected project object
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Hardcoded mock projects (ideally fetched from a service or props)
// Taken from src/app/(app)/projects/page.tsx
const mockProjects: Project[] = [
  { id: "proj001", name: "Summer Music Festival 2024", startDate: "2024-06-01", endDate: "2024-08-31", status: "In Progress", description: "Annual summer music festival featuring diverse artists." },
  { id: "proj002", name: "Tech Conference X", startDate: "2024-09-15", endDate: "2024-09-17", status: "Planning", description: "Major technology conference showcasing new innovations." },
  { id: "proj003", name: "Corporate Gala Dinner", startDate: "2024-11-05", endDate: "2024-11-05", status: "Completed", description: "Annual corporate fundraising gala." },
];


export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null); // Default to "All Projects"

  const projects = useMemo(() => mockProjects, []);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const value = useMemo(() => ({
    selectedProjectId,
    setSelectedProjectId,
    projects,
    selectedProject,
  }), [selectedProjectId, projects, selectedProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
