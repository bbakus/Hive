
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext'; // Import Organization context

// Define project structure
export type KeyPersonnel = {
  personnelId: string;
  name: string;
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
  organizationId: string;
  createdByUserId?: string;
};

export type ProjectFormData = Omit<Project, 'id' | 'createdByUserId'> & {
  location?: string;
  keyPersonnel?: KeyPersonnel[];
};


type ProjectContextType = {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  projects: Project[];
  addProject: (projectData: Omit<ProjectFormData, 'organizationId'>, organizationId: string, userId?: string) => void;
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
    organizationId: "org_g9e",
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
    organizationId: "org_damion_hamilton",
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
    organizationId: "org_g9e",
    createdByUserId: "user_admin_demo",
  },
  {
    id: "proj004",
    name: "Oracle Cloud World Wrap-up",
    startDate: "2024-10-01",
    endDate: "2024-10-31",
    status: "Planning",
    description: "Post-event content production for Oracle Cloud World.",
    location: "Remote",
    organizationId: "org_g9e",
    createdByUserId: "user_admin_demo",
  },
  {
    id: "proj005",
    name: "ServiceNow Knowledge On-Site",
    startDate: "2025-05-10",
    endDate: "2025-05-15",
    status: "Planning",
    description: "Event coverage for ServiceNow Knowledge conference.",
    location: "Las Vegas Convention Center",
    organizationId: "org_damion_hamilton",
    createdByUserId: "user_admin_demo",
  },
  {
    id: "proj_g9e_summit",
    name: "G9e Corporate Summit 2024",
    startDate: "2024-08-01",
    endDate: "2024-08-04",
    status: "Planning",
    description: "Multi-day corporate summit for G9e, requiring extensive photographic coverage.",
    location: "Grand Hyatt, San Diego",
    keyPersonnel: [
        { personnelId: "user003", name: "Charlie Chaplin", projectRole: "Lead Producer" },
        { personnelId: "user006", name: "Fiona Gallagher", projectRole: "Production Coordinator" }
    ],
    organizationId: "org_g9e",
    createdByUserId: "user_admin_demo",
  }
];


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedOrganizationId } = useOrganizationContext(); // Consume OrganizationContext

  const [allProjects, setAllProjects] = useState<Project[]>([]); // Holds all projects regardless of org filter
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      const loadedProjects = useDemoData ? initialMockProjects : [];
      setAllProjects(loadedProjects);
      setIsLoadingProjects(false);
    }
  }, [useDemoData, isLoadingSettings]);

  const projectsForSelectedOrg = useMemo(() => {
    if (selectedOrganizationId === ALL_ORGANIZATIONS_ID) {
      return allProjects;
    }
    return allProjects.filter(p => p.organizationId === selectedOrganizationId);
  }, [allProjects, selectedOrganizationId]);


  useEffect(() => {
    if (!isLoadingProjects) {
      if (projectsForSelectedOrg.length > 0) {
        const currentSelectionIsValid = selectedProjectId && projectsForSelectedOrg.some(p => p.id === selectedProjectId);
        if (!currentSelectionIsValid) {
          setSelectedProjectIdState(projectsForSelectedOrg[0].id);
        }
      } else {
        setSelectedProjectIdState(null);
      }
    }
  }, [projectsForSelectedOrg, selectedProjectId, isLoadingProjects]);


  const addProject = useCallback((projectData: Omit<ProjectFormData, 'organizationId'>, organizationId: string, userId?: string) => {
    setAllProjects((prevProjects) => {
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
    setAllProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === projectId ? { ...proj, ...projectData, keyPersonnel: projectData.keyPersonnel || proj.keyPersonnel } : proj
      )
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setAllProjects((prevProjects) =>
      prevProjects.filter((proj) => proj.id !== projectId)
    );
    // If the deleted project was the selected one, reset selection
    if (selectedProjectId === projectId) {
        setSelectedProjectIdState(null); // Will be auto-selected to first in list by the other useEffect
    }
  }, [selectedProjectId]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projectsForSelectedOrg.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projectsForSelectedOrg]);

  const value = useMemo(() => ({
    selectedProjectId,
    setSelectedProjectId: setSelectedProjectIdState,
    projects: projectsForSelectedOrg, // Provide filtered projects
    addProject,
    updateProject,
    deleteProject,
    selectedProject,
    isLoadingProjects,
  }), [selectedProjectId, projectsForSelectedOrg, addProject, updateProject, deleteProject, selectedProject, isLoadingProjects]);

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
