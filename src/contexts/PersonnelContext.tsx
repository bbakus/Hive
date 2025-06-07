
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext';
import { default_api } from '@/lib/utils';

// Define the Personnel type, similar to what's in personnel/page.tsx
export type Personnel = {
  id: string;
  name: string;
  role: string; // Assuming role is a string, adjust if needed
  status?: string; // Assuming status is optional string
  avatar?: string; // Optional avatar URL
  cameraSerials?: string[];
  contact?: string;
};

type PersonnelContextType = {
  personnelList: Personnel[];
  isLoadingPersonnel: boolean;
  // Optional: Add functions for adding, updating, deleting personnel
  // These would ideally interact with a backend API when not in demo mode
  addPersonnel: (personnelData: Omit<Personnel, 'id'>) => string; // Returns new ID
  updatePersonnel: (personnelId: string, personnelData: Partial<Omit<Personnel, 'id'>>) => void;
  deletePersonnel: (personnelId: string) => void;
  getPersonnelById: (personnelId: string) => Personnel | undefined;
};

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

export function PersonnelProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);

  useEffect(() => {
    const loadPersonnelData = async () => {
      if (isLoadingSettings) return;

      setIsLoadingPersonnel(true);
      let loadedPersonnel: Personnel[] = [];

      if (useDemoData) {
        try {
          const response = await default_api.read_file({ path: "public/demo/demo_data.json" });
          if (response.status === 'succeeded') {
            const demoData = JSON.parse(response.result);
            if (demoData && Array.isArray(demoData.personnel)) {
              loadedPersonnel = demoData.personnel.map((p: any) => ({
                 id: p.personnelId, // Map personnelId from JSON to id in type
                 name: p.name,
                 role: p.role, 
                 contact: p.contact,
                 status: p.status || "Available", 
                 avatar: p.avatar, 
                 cameraSerials: p.cameraSerials || [], 
              }));
            } else {
               console.error("Demo data file does not contain a 'personnel' array or is empty.");
            }
          } else {
            console.error("Failed to read demo data file:", response.error);
          }
        } catch (error) {
          console.error("Error processing demo data JSON for personnel:", error);
        }
      } else {
        // TODO: Implement fetching real personnel data from backend API
        console.warn("Demo data mode is off. Implement actual API call to fetch personnel.");
        // Example placeholder for fetching real data:
        // try {
        //   const res = await fetch('/api/personnel'); // Your backend endpoint
        //   if (res.ok) {
        //     const data = await res.json();
        //     loadedPersonnel = data; // Assuming backend returns array of Personnel
        //   } else {
        //     console.error("Failed to fetch real personnel:", res.statusText);
        //   }
        // } catch (error) {
        //    console.error("Error fetching real personnel:", error);
        // }
         loadedPersonnel = []; // Default to empty if no real data fetching implemented
      }
      setPersonnelList(loadedPersonnel);
      setIsLoadingPersonnel(false);
    };

    loadPersonnelData();
  }, [useDemoData, isLoadingSettings]); // Depend on useDemoData and isLoadingSettings

  const addPersonnel = useCallback((personnelData: Omit<Personnel, 'id'>): string => {
    const newId = `user_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPersonnel: Personnel = {
      ...personnelData,
      id: newId,
      cameraSerials: personnelData.cameraSerials || [],
    };
    setPersonnelList(prevList => [...prevList, newPersonnel]);

    if (!useDemoData) {
      console.warn("Demo data mode is off. Implement actual API call to add personnel:", newPersonnel);
      // TODO: Implement real API call to add personnel
    }
    return newId;
  }, [useDemoData]); // Depend on useDemoData

  const updatePersonnel = useCallback((personnelId: string, personnelData: Partial<Omit<Personnel, 'id'>>) => {
    setPersonnelList(prevList =>
      prevList.map(p =>
        p.id === personnelId ? { ...p, ...personnelData, cameraSerials: personnelData.cameraSerials || p.cameraSerials } : p
      )
    );
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to update personnel:", personnelId, personnelData);
        // TODO: Implement real API call to update personnel
     }
  }, [useDemoData]); // Depend on useDemoData

  const deletePersonnel = useCallback((personnelId: string) => {
    setPersonnelList(prevList => prevList.filter(p => p.id !== personnelId));
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to delete personnel:", personnelId);
        // TODO: Implement real API call to delete personnel
     }
  }, [useDemoData]); // Depend on useDemoData

  const getPersonnelById = useCallback((personnelId: string) => {
    return personnelList.find(p => p.id === personnelId);
  }, [personnelList]); // Depend on personnelList

  const value = useMemo(() => ({
    personnelList,
    isLoadingPersonnel,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    getPersonnelById,
  }), [personnelList, isLoadingPersonnel, addPersonnel, updatePersonnel, deletePersonnel, getPersonnelById]);

  return (
    <PersonnelContext.Provider value={value}>
      {children}
    </PersonnelContext.Provider>
  );
}

export function usePersonnelContext() {
  const context = useContext(PersonnelContext);
  if (context === undefined) {
    throw new Error('usePersonnelContext must be used within a PersonnelProvider');
  }
  return context;
}
