
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

const CULINARY_PROJECT_ID = "proj_pb_culinary_classic_2025";
const CULINARY_ORG_ID = "org_g9e"; // Assuming G9e hosts this

const getInitialMockProjects = (): Project[] => [
  {
    id: CULINARY_PROJECT_ID,
    name: "Pebble Beach Culinary Classic 2025",
    startDate: "2025-05-16", // Friday
    endDate: "2025-05-18",   // Sunday
    status: "Planning",
    description: "A 3-day premier culinary festival featuring world-renowned chefs, wine tastings, and exclusive dining experiences. HIVE will provide comprehensive photographic coverage across all main events and selected private functions.",
    location: "Pebble Beach Resorts, CA",
    keyPersonnel: [
      { personnelId: "user_liam_w", name: "Liam Wilson", projectRole: "Project Manager" },
      { personnelId: "user_ava_m", name: "Ava Miller", projectRole: "Lead Editor" },
      { personnelId: "user_maria_s", name: "Maria Sanchez", projectRole: "Lead Photographer Day 1" },
      { personnelId: "user_david_l", name: "David Lee", projectRole: "Lead Photographer Day 2" },
      { personnelId: "user_sophia_c", name: "Sophia Chen", projectRole: "Lead Photographer Day 3" },
      { personnelId: "user_event_lead_ops", name: "Ops Event Lead", projectRole: "Event Lead"},
    ],
    organizationId: CULINARY_ORG_ID,
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
        setSelectedProjectIdState(loadedProjects[0].id);
      } else {
        setSelectedProjectIdState(null);
      }
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
        id: `proj_new_${Date.now()}`,
        keyPersonnel: projectData.keyPersonnel || [],
        organizationId: organizationId,
        createdByUserId: userId,
      };
      const updatedProjects = [...prevProjects, newProject];
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

    