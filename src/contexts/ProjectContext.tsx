
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID, type Organization } from './OrganizationContext'; // Added Organization type
import { type Personnel } from '@/contexts/PersonnelContext';

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
  allPersonnel: Personnel[];
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedOrganizationId, organizations } = useOrganizationContext(); // Added organizations

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!isLoadingSettings) {
        setIsLoadingProjects(true);
        let loadedProjects: Project[] = [];
        if (useDemoData) {
          try {
            const response = await fetch('/demo/demo_data.json');
            if (response.ok) {
              const demoData = await response.json();
              
              if (demoData && Array.isArray(demoData.projects)) {
                loadedProjects = demoData.projects.map((p: any) => ({
                  id: p.projectId,
                  name: p.name,
                  startDate: p.startDate,
                  endDate: p.endDate,
                  status: p.status,
                  description: p.description,
                  location: p.location,
                  keyPersonnel: p.keyPersonnel || [],
                  organizationId: p.organizationId,
                  createdByUserId: p.createdByUserId,
                }));

                if (demoData.personnel && Array.isArray(demoData.personnel)) {
                    setAllPersonnel(demoData.personnel);
                } else { setAllPersonnel([]); }
              } else {
                 console.error("Demo data file does not contain a 'projects' array or is empty.");
              }
            } else {
              console.error("Failed to fetch demo data file:", response.statusText);
            }
          } catch (error) {
            console.error("Error fetching or parsing demo data JSON:", error);
          }
        } else {
          // Fetch real project data
          setAllPersonnel([]); // Reset personnel when not using demo data
          try {
            const response = await fetch('/api/projects');
            if (response.ok) {
              const apiProjects: Array<{ id: string, name: string, client: string }> = await response.json();
              
              // Determine a default organization ID for projects fetched from the API
              // as the current API doesn't provide it.
              let defaultOrgId = "org_g9e"; // Fallback default
              if (selectedOrganizationId && selectedOrganizationId !== ALL_ORGANIZATIONS_ID) {
                defaultOrgId = selectedOrganizationId;
              } else if (organizations.length > 0) {
                defaultOrgId = organizations[0].id;
              }

              loadedProjects = apiProjects.map(apiProj => ({
                id: apiProj.id,
                name: apiProj.name,
                // Client from API can be mapped to description or a new field if needed
                description: `Client: ${apiProj.client}`, 
                organizationId: defaultOrgId, // Placeholder, API should provide this
                status: "Planning", // Default status
                keyPersonnel: [], // Default
                // Other fields will be undefined or have defaults
              }));
            } else {
              console.error("Failed to fetch live project data:", response.statusText);
              loadedProjects = []; // Fallback to empty if API call fails
            }
          } catch (error) {
            console.error("Error fetching live project data:", error);
            loadedProjects = []; // Fallback to empty on network error
          }
        }

        setAllProjects(loadedProjects);
        const projectsInCurrentOrg = selectedOrganizationId === ALL_ORGANIZATIONS_ID 
          ? loadedProjects 
          : loadedProjects.filter(p => p.organizationId === selectedOrganizationId);
        
        if (projectsInCurrentOrg.length > 0) {
          if (!selectedProjectId || !projectsInCurrentOrg.some(p => p.id === selectedProjectId)) {
             setSelectedProjectIdState(projectsInCurrentOrg[0].id);
          }
        } else {
          setSelectedProjectIdState(null);
        }
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [useDemoData, isLoadingSettings, selectedOrganizationId, organizations, selectedProjectId]); // Added organizations to dependencies

  const projectsForSelectedOrg = useMemo(() => {
    if (selectedOrganizationId === ALL_ORGANIZATIONS_ID) {
      return allProjects;
    }
    return allProjects.filter(p => p.organizationId === selectedOrganizationId);
  }, [allProjects, selectedOrganizationId]);

  useEffect(() => {
    if (!isLoadingProjects && projectsForSelectedOrg.length > 0) {
      const currentSelectionIsValid = selectedProjectId && projectsForSelectedOrg.some(p => p.id === selectedProjectId);
      if (!currentSelectionIsValid) {
        setSelectedProjectIdState(projectsForSelectedOrg[0].id);
      }
    } else if (!isLoadingProjects && projectsForSelectedOrg.length === 0) {
       setSelectedProjectIdState(null);
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
      
      const shouldSelectNewProject = 
        (selectedOrganizationId === ALL_ORGANIZATIONS_ID || organizationId === selectedOrganizationId) &&
        (selectedProjectId === null || projectsForSelectedOrg.length === 0);

      if (shouldSelectNewProject) {
         setSelectedProjectIdState(newProject.id);
      } else if (selectedOrganizationId === ALL_ORGANIZATIONS_ID && selectedProjectId === null && updatedProjects.length === 1) {
         setSelectedProjectIdState(newProject.id);
      }
      return updatedProjects;
    });
     if (!useDemoData) {
         console.warn("Live Add Project: Implement actual API call to add project to backend.");
         // Example: fetch('/api/projects', { method: 'POST', body: JSON.stringify(newProjectWithOrg) });
     }
  }, [selectedOrganizationId, selectedProjectId, projectsForSelectedOrg, useDemoData]);

  const updateProject = useCallback((projectId: string, projectData: Partial<ProjectFormData>) => {
    setAllProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === projectId ? { ...proj, ...projectData, keyPersonnel: projectData.keyPersonnel || proj.keyPersonnel } : proj
      )
    );
     if (!useDemoData) {
         console.warn("Live Update Project: Implement actual API call to update project on backend.");
         // Example: fetch(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(projectData) });
     }
  }, [useDemoData]);

  const deleteProject = useCallback((projectId: string) => {
    setAllProjects((prevProjects) =>
      prevProjects.filter((proj) => proj.id !== projectId)
    );
    if (selectedProjectId === projectId) {
        const remainingOrgProjects = projectsForSelectedOrg.filter(p => p.id !== projectId);
        setSelectedProjectIdState(remainingOrgProjects.length > 0 ? remainingOrgProjects[0].id : null);
    }
     if (!useDemoData) {
         console.warn("Live Delete Project: Implement actual API call to delete project from backend.");
         // Example: fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
     }
  }, [selectedProjectId, projectsForSelectedOrg, useDemoData]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return allProjects.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, allProjects]);

  const value = useMemo(() => ({
    selectedProjectId,
    setSelectedProjectId: setSelectedProjectIdState,
    projects: projectsForSelectedOrg, 
    addProject,
    updateProject,
    deleteProject,
    selectedProject,
    isLoadingProjects,
    allPersonnel,
  }), [selectedProjectId, setSelectedProjectIdState, projectsForSelectedOrg, addProject, updateProject, deleteProject, selectedProject, isLoadingProjects, allPersonnel]);

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
