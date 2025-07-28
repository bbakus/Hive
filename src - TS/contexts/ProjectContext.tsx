
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID, type Organization } from './OrganizationContext'; // Added Organization type
import { type Personnel } from './PersonnelContext';

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
  addProject: (projectData: Omit<ProjectFormData, 'organizationId'>, organizationId: string, userId?: string) => Promise<void>;
  updateProject: (projectId: string, projectData: Partial<ProjectFormData>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  selectedProject: Project | null;
  isLoadingProjects: boolean;
  allPersonnel: Personnel[];
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isLoading: isLoadingSettings } = useSettingsContext();
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
        
        // Always fetch real project data
        setAllPersonnel([]);
        try {
          const response = await fetch('/api/projects');
          if (response.ok) {
            const apiProjects: Array<{ 
              id: string, 
              name: string, 
              client?: string, 
              organizationId?: string,
              status?: string,
              description?: string,
              startDate?: string,
              endDate?: string,
              location?: string,
              keyPersonnel?: KeyPersonnel[]
            }> = await response.json();
            
            let defaultOrgForFallback = "1"; // Default to HIVE Productions 
            if (selectedOrganizationId && selectedOrganizationId !== ALL_ORGANIZATIONS_ID) {
              defaultOrgForFallback = selectedOrganizationId;
            } else if (organizations.length > 0) {
              defaultOrgForFallback = organizations[0].id;
            }

            loadedProjects = apiProjects.map(apiProj => ({
              id: apiProj.id,
              name: apiProj.name,
              description: apiProj.description || '', 
              organizationId: apiProj.organizationId || defaultOrgForFallback,
              status: apiProj.status || "Planning", 
              startDate: apiProj.startDate || '',
              endDate: apiProj.endDate || '',
              location: apiProj.location || '',
              keyPersonnel: apiProj.keyPersonnel || [],
            }));
          } else {
            console.error("Failed to fetch project data:", response.statusText);
            loadedProjects = []; 
          }
        } catch (error) {
          console.error("Error fetching project data:", error);
          loadedProjects = []; 
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
  }, [isLoadingSettings, selectedOrganizationId, organizations, selectedProjectId]);

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

  const addProject = useCallback(async (projectData: Omit<ProjectFormData, 'organizationId'>, organizationId: string, userId?: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectData,
          organizationId: organizationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create project:', errorData);
        throw new Error(errorData.error || 'Failed to create project');
      }

      const newProjectFromApi = await response.json();
      
      // Add to local state using the response from API
      setAllProjects((prevProjects) => {
        const newProject: Project = {
          ...newProjectFromApi,
          keyPersonnel: projectData.keyPersonnel || [],
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
    } catch (error) {
      console.error('Error creating project:', error);
      throw error; // Re-throw so the calling component can handle it
    }
  }, [selectedOrganizationId, selectedProjectId, projectsForSelectedOrg]);

  const updateProject = useCallback(async (projectId: string, projectData: Partial<ProjectFormData>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to update project:', errorData);
        throw new Error(errorData.error || 'Failed to update project');
      }

      const updatedProjectFromApi = await response.json();
      
      // Update local state with the response from the API
      console.log('Updated project from API:', updatedProjectFromApi);
      setAllProjects((prevProjects) =>
        prevProjects.map((proj) =>
          proj.id === projectId ? {
            ...proj,
            ...updatedProjectFromApi,
            keyPersonnel: updatedProjectFromApi.keyPersonnel || []
          } : proj
        )
      );
    } catch (error) {
      console.error('Error updating project:', error);
      throw error; // Re-throw so the calling component can handle it
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to delete project:', errorData);
        throw new Error(errorData.error || 'Failed to delete project');
      }

      // Update local state after successful deletion
      setAllProjects((prevProjects) =>
        prevProjects.filter((proj) => proj.id !== projectId)
      );
      
      if (selectedProjectId === projectId) {
          const remainingOrgProjects = projectsForSelectedOrg.filter(p => p.id !== projectId);
          setSelectedProjectIdState(remainingOrgProjects.length > 0 ? remainingOrgProjects[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error; // Re-throw so the calling component can handle it
    }
  }, [selectedProjectId, projectsForSelectedOrg]);

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

