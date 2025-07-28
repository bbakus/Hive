
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsContext } from './SettingsContext';

// Define the Personnel type, similar to what's in personnel/page.tsx
export type Personnel = {
  personnelId: string;
  name: string;
  role: string;
  status?: string;
  avatar?: string;
  cameraSerials?: string[];
  contact?: string;
};

type PersonnelContextType = {
  personnelList: Personnel[];
  isLoadingPersonnel: boolean;
  addPersonnel: (personnelData: Omit<Personnel, 'personnelId'>) => string;
  updatePersonnel: (personnelId: string, personnelData: Partial<Omit<Personnel, 'personnelId'>>) => void;
  deletePersonnel: (personnelId: string) => void;
  getPersonnelById: (personnelId: string) => Personnel | undefined;
};

const PersonnelContext = createContext<PersonnelContextType | undefined>(undefined);

export function PersonnelProvider({ children }: { children: ReactNode }) {
  const { isLoading: isLoadingSettings } = useSettingsContext();
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(true);

  useEffect(() => {
    const loadPersonnelData = async () => {
      if (isLoadingSettings) return;

      setIsLoadingPersonnel(true);
      let loadedPersonnel: Personnel[] = [];

      // Always fetch real personnel data from backend API
      try {
        const res = await fetch('/api/personnel');
        if (res.ok) {
          const data = await res.json();
          loadedPersonnel = data.map((p: any) => {
            const personnelId = p.personnelId || p.id;
            if (!personnelId) {
              console.warn('Personnel record missing ID:', p);
              return null;
            }
            return {
              personnelId: personnelId.toString(),
              name: p.name || '',
              role: p.role || '',
              status: p.status || "Available",
              avatar: p.avatar,
              cameraSerials: p.cameraSerials || [],
              contact: p.contact || p.email || ''
            };
          }).filter(Boolean) as Personnel[];
        } else {
          console.error("Failed to fetch personnel:", res.statusText);
          loadedPersonnel = [];
        }
      } catch (error) {
        console.error("Error fetching personnel:", error);
        loadedPersonnel = [];
      }

      setPersonnelList(loadedPersonnel);
      setIsLoadingPersonnel(false);
    };

    loadPersonnelData();
  }, [isLoadingSettings]);

  const addPersonnel = useCallback((personnelData: Omit<Personnel, 'personnelId'>): string => {
    const newId = `user_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPersonnel: Personnel = {
      ...personnelData,
      personnelId: newId,
      cameraSerials: personnelData.cameraSerials || [],
    };
    setPersonnelList(prevList => [...prevList, newPersonnel]);

    // TODO: Implement real API call to add personnel
    console.log("Adding personnel:", newPersonnel);
    return newId;
  }, []);

  const updatePersonnel = useCallback((personnelId: string, personnelData: Partial<Omit<Personnel, 'personnelId'>>) => {
    setPersonnelList(prevList =>
      prevList.map(p =>
        p.personnelId === personnelId ? { ...p, ...personnelData, cameraSerials: personnelData.cameraSerials || p.cameraSerials } : p
      )
    );
    // TODO: Implement real API call to update personnel
    console.log("Updating personnel:", personnelId, personnelData);
  }, []);

  const deletePersonnel = useCallback((personnelId: string) => {
    setPersonnelList(prevList => prevList.filter(p => p.personnelId !== personnelId));
    // TODO: Implement real API call to delete personnel
    console.log("Deleting personnel:", personnelId);
  }, []);

  const getPersonnelById = useCallback((personnelId: string): Personnel | undefined => {
    return personnelList.find(p => p.personnelId === personnelId);
  }, [personnelList]);

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
