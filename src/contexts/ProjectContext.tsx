
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext'; // Import useSettingsContext

// Define project structure
export type KeyPersonnel = {
  personnelId: string;
  name: string; // Store name for easier display, though ID is the key
  projectRole: string;
};

export type Project = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  description?: string;
  location?: string;
  keyPersonnel?: KeyPersonnel[];
  organizationId: string; // NEW: For multi-tenancy
  createdByUserId?: string; // NEW: Optional, for tracking who created it
};

export type ProjectFormData = Omit<Project, 'id' | 'organizationId' | 'createdByUserId'> & { // Exclude IDs managed by system
  location?: string;
  keyPersonnel?: KeyPersonnel[];
};


type ProjectContextType = {
  selectedProjectId: string | null; 
  setSelectedProjectId: (projectId: string | null) => void;
  projects: Project[]; 
  addProject: (projectData: ProjectFormData, organizationId: string, userId?: string) => void; 
  updateProject: (projectId: string, projectData: Partial<ProjectFormData>) => void; 
  deleteProject: (projectId: string) => void; 
  selectedProject: Project | null; 
  isLoadingProjects: boolean;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const initialMockProjects: Project[] = [
  {
    id: "proj001",
    name: "Summer Music Festival 2024",
    startDate: "2024-06-01",
    endDate: "2024-08-31",
    status: "In Progress",
    description: "Annual summer music festival featuring diverse artists.",
    location: "Central Park, New York",
    keyPersonnel: [
      { personnelId: "user001", name: "Alice Wonderland", projectRole: "Festival Director" },
      { personnelId: "user003", name: "Charlie Chaplin", projectRole: "Production Manager" },
    ],
    organizationId: "org_default_demo", 
    createdByUserId: "user_admin_demo", 
  },
  {
    id: "proj002",
    name: "Tech Conference X",
    startDate: "2024-09-15",
    endDate: "2024-09-17",
    status: "Planning",
    description: "Major technology conference showcasing new innovations.",
    location: "Moscone Center, San Francisco",
    keyPersonnel: [
      { personnelId: "user002", name: "Bob The Builder", projectRole: "Lead Organizer" }
    ],
    organizationId: "org_default_demo",
    createdByUserId: "user_admin_demo",
  },
  {
    id: "proj003",
    name: "Corporate Gala Dinner",
    startDate: "2024-11-05",
    endDate: "2024-11-05",
    status: "Completed",
    description: "Annual corporate fundraising gala.",
    location: "The Grand Ballroom",
    keyPersonnel: [],
    organizationId: "org_another_demo", 
    createdByUserId: "user_other_admin_demo",
  },
];


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const setSelectedProjectId = useCallback((projectId: string | null) => {
    setSelectedProjectIdState(projectId);
  }, []);

  useEffect(() => {
    if (!isLoadingSettings) {
      const loadedProjects = useDemoData ? initialMockProjects : [];
      setProjects(loadedProjects);
      setIsLoadingProjects(false);
    }
  }, [useDemoData, isLoadingSettings]);

  // Effect to handle default project selection
  useEffect(() => {
    if (!isLoadingProjects) { // Ensure projects are loaded
      if (projects.length > 0) {
        const currentSelectionIsValid = selectedProjectId && projects.some(p => p.id === selectedProjectId);
        if (!currentSelectionIsValid) {
          // If no project is selected, or the selected one no longer exists, select the first project.
          setSelectedProjectIdState(projects[0].id);
        }
      } else {
        // If there are no projects, ensure no project is selected.
        setSelectedProjectIdState(null);
      }
    }
  }, [projects, selectedProjectId, isLoadingProjects]);


  const addProject = useCallback((projectData: ProjectFormData, organizationId: string, userId?: string) => {
    setProjects((prevProjects) => {
      const newProject: Project = {
        ...projectData,
        id: `proj${String(prevProjects.length + initialMockProjects.length + 1 + Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        keyPersonnel: projectData.keyPersonnel || [],
        organizationId: organizationId, 
        createdByUserId: userId,
      };
      return [...prevProjects, newProject];
    });
  }, []);

  const updateProject = useCallback((projectId: string, projectData: Partial<ProjectFormData>) => {
    setProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === projectId ? { ...proj, ...projectData, keyPersonnel: projectData.keyPersonnel || proj.keyPersonnel } : proj
      )
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prevProjects) =>
      prevProjects.filter((proj) => proj.id !== projectId)
    );
    // If the deleted project was the selected one, selectedProjectId will be handled by the default selection useEffect.
  }, []);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const value = useMemo(() => ({
    selectedProjectId,
    setSelectedProjectId,
    projects,
    addProject,
    updateProject,
    deleteProject,
    selectedProject,
    isLoadingProjects,
  }), [selectedProjectId, setSelectedProjectId, projects, addProject, updateProject, deleteProject, selectedProject, isLoadingProjects]);

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
