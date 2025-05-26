
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
  // Ensure new fields are part of the form data type if they are user-editable during creation/update
  location?: string;
  keyPersonnel?: KeyPersonnel[];
};


type ProjectContextType = {
  selectedProjectId: string | null; // null means "All Projects"
  setSelectedProjectId: (projectId: string | null) => void;
  projects: Project[]; // List of all available projects
  addProject: (projectData: ProjectFormData, organizationId: string, userId?: string) => void; // Pass orgId and userId
  updateProject: (projectId: string, projectData: Partial<ProjectFormData>) => void; // Function to update a project
  deleteProject: (projectId: string) => void; // Function to delete a project
  selectedProject: Project | null; // The full selected project object
  isLoadingProjects: boolean;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// TODO: In a real multi-tenant app, this initial data would be fetched based on the user's organization.
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
    organizationId: "org_default_demo", // Example organization ID
    createdByUserId: "user_admin_demo", // Example user ID
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
    organizationId: "org_another_demo", // Example for a different organization
    createdByUserId: "user_other_admin_demo",
  },
];


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      // TODO: In a real multi-tenant app, fetch projects for the current user's organization.
      // For now, we filter the mock data if we had a current organization ID.
      // Assuming a hypothetical currentOrganizationId for demo filtering:
      // const currentOrganizationId = "org_default_demo";
      // const orgProjects = useDemoData ? initialMockProjects.filter(p => p.organizationId === currentOrganizationId) : [];
      // setProjects(orgProjects);

      // Simpler approach for now: just load based on demo data toggle, no org filtering in context yet.
      setProjects(useDemoData ? initialMockProjects : []);
      setIsLoadingProjects(false);
    }
  }, [useDemoData, isLoadingSettings]);


  const addProject = useCallback((projectData: ProjectFormData, organizationId: string, userId?: string) => {
    setProjects((prevProjects) => {
      const newProject: Project = {
        ...projectData,
        id: `proj${String(prevProjects.length + initialMockProjects.length + 1 + Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        keyPersonnel: projectData.keyPersonnel || [],
        organizationId: organizationId, // Assign the organization ID
        createdByUserId: userId,
      };
      return [...prevProjects, newProject];
    });
  }, []);

  const updateProject = useCallback((projectId: string, projectData: Partial<ProjectFormData>) => {
    setProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === projectId ? { ...proj, ...projectData } : proj
      )
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prevProjects) =>
      prevProjects.filter((proj) => proj.id !== projectId)
    );
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  }, [selectedProjectId]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    // TODO: Ensure selected project belongs to current user's organization.
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
  }), [selectedProjectId, projects, addProject, updateProject, deleteProject, selectedProject, isLoadingProjects]);

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
