
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


export function ProjectProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedOrganizationId } = useOrganizationContext(); 

  const [allProjects, setAllProjects] = useState<Project[]>([]); 
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!isLoadingSettings) {
        setIsLoadingProjects(true);
        let loadedProjects: Project[] = [];
        if (useDemoData) {
          try {
            const response = await fetch("/demo/demo_data.json");
            if (response.ok) {
              const demoData = await response.json();
              // Assuming the demo data JSON has a top-level 'projects' array
              if (demoData && Array.isArray(demoData.projects)) {
                // Map the demo data structure to the Project type if necessary
                loadedProjects = demoData.projects.map((p: any) => ({
                  id: p.projectId, // Map projectId from JSON to id in type
                  name: p.name,
                  startDate: p.startDate,
                  endDate: p.endDate,
                  status: p.status,
                  description: p.description,
                  location: p.location,
                  keyPersonnel: p.keyPersonnel || [], // Ensure keyPersonnel is an array
                  organizationId: p.organizationId, // Assuming organizationId is in demo data
                  createdByUserId: p.createdByUserId,
                }));
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
          // TODO: Implement fetching real project data from backend API
          console.warn("Demo data mode is off. Implement actual API call to fetch projects.");
          loadedProjects = []; // Start with empty array when not using demo data
        }

        setAllProjects(loadedProjects);
        // Logic to select initial project based on loaded projects and selected organization
        const projectsInCurrentOrg = selectedOrganizationId === ALL_ORGANIZATIONS_ID 
          ? loadedProjects 
          : loadedProjects.filter(p => p.organizationId === selectedOrganizationId);
        
        if (projectsInCurrentOrg.length > 0) {
          // If the currently selected project is not in the filtered list, select the first one.
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
  }, [useDemoData, isLoadingSettings, selectedOrganizationId]); // Depend on useDemoData and selectedOrganizationId

  const projectsForSelectedOrg = useMemo(() => {
    if (selectedOrganizationId === ALL_ORGANIZATIONS_ID) {
      return allProjects;
    }
    return allProjects.filter(p => p.organizationId === selectedOrganizationId);
  }, [allProjects, selectedOrganizationId]);


  // This effect keeps the selected project in sync with the filtered list
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
    // This add logic works for demo data as well, generating a new ID
    setAllProjects((prevProjects) => {
      const newProject: Project = {
        ...projectData,
        id: `proj_new_${Date.now()}`,
        keyPersonnel: projectData.keyPersonnel || [],
        organizationId: organizationId,
        createdByUserId: userId,
      };
      const updatedProjects = [...prevProjects, newProject];
      
      // Auto-select new project if it matches current org filter or if no org filter
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
    // TODO: Add logic to save the new project if not in demo mode
     if (!useDemoData) {
         console.warn("Demo data mode is off. Implement actual API call to add project.");
     }

  }, [selectedOrganizationId, selectedProjectId, projectsForSelectedOrg, useDemoData]);

  const updateProject = useCallback((projectId: string, projectData: Partial<ProjectFormData>) => {
    setAllProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === projectId ? { ...proj, ...projectData, keyPersonnel: projectData.keyPersonnel || proj.keyPersonnel } : proj
      )
    );
     // TODO: Add logic to save the updated project if not in demo mode
     if (!useDemoData) {
         console.warn("Demo data mode is off. Implement actual API call to update project.");
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
    // TODO: Add logic to delete the project if not in demo mode
     if (!useDemoData) {
         console.warn("Demo data mode is off. Implement actual API call to delete project.");
     }
  }, [selectedProjectId, projectsForSelectedOrg, useDemoData]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    // Find in all projects, as projectsForSelectedOrg might change based on org filter
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

    