
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import { format, subDays, addDays } from 'date-fns';

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

const getInitialMockProjects = (): Project[] => [
  {
    id: "proj_g9e_summit_2024",
    name: "G9e Annual Summit 2024",
    startDate: format(subDays(new Date(), 1), "yyyy-MM-dd"), 
    endDate: format(addDays(new Date(), 2), "yyyy-MM-dd"),   
    status: "In Progress",
    description: "Comprehensive photographic coverage of the G9e Annual Summit 2024 over 4 days, involving 4 key photographers.",
    location: "Grand Conference Center, Metropolis",
    keyPersonnel: [
      { personnelId: "user003", name: "Charlie Chaplin", projectRole: "Project Manager" },
      { personnelId: "user005", name: "Edward Scissorhands", projectRole: "Lead Editor" },
    ],
    organizationId: "org_g9e",
    createdByUserId: "user_admin_demo",
  }
];


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedOrganizationId } = useOrganizationContext(); 

  const [allProjects, setAllProjects] = useState<Project[]>([]); 
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      const loadedProjects = useDemoData ? getInitialMockProjects() : [];
      setAllProjects(loadedProjects);
      if (loadedProjects.length > 0) {
        // Default selection to the new single project if demo data is on
        setSelectedProjectIdState(loadedProjects[0].id);
      } else {
        setSelectedProjectIdState(null);
      }
      setIsLoadingProjects(false);
    }
  }, [useDemoData, isLoadingSettings]);

  const projectsForSelectedOrg = useMemo(() => {
    if (selectedOrganizationId === ALL_ORGANIZATIONS_ID) {
      return allProjects; // Should ideally be empty or one if only G9e exists
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
        id: `proj${String(prevProjects.length + getInitialMockProjects().length + 1 + Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        keyPersonnel: projectData.keyPersonnel || [],
        organizationId: organizationId,
        createdByUserId: userId,
      };
      const updatedProjects = [...prevProjects, newProject];
       // If this is the first project for the currently selected org (or for "All Orgs" if applicable), select it.
      const currentOrgProjects = selectedOrganizationId === ALL_ORGANIZATIONS_ID 
                                ? updatedProjects 
                                : updatedProjects.filter(p => p.organizationId === selectedOrganizationId);
      if (currentOrgProjects.length === 1 || (currentOrgProjects.length > 0 && selectedProjectId === null) ) {
        setSelectedProjectIdState(newProject.id);
      }
      return updatedProjects;
    });
  }, [selectedOrganizationId, selectedProjectId]);

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
    if (selectedProjectId === projectId) {
        const remainingOrgProjects = projectsForSelectedOrg.filter(p => p.id !== projectId);
        setSelectedProjectIdState(remainingOrgProjects.length > 0 ? remainingOrgProjects[0].id : null);
    }
  }, [selectedProjectId, projectsForSelectedOrg]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projectsForSelectedOrg.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projectsForSelectedOrg]);

  const value = useMemo(() => ({
    selectedProjectId,
    setSelectedProjectId: setSelectedProjectIdState,
    projects: projectsForSelectedOrg, 
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
