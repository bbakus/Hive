
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

export type Organization = {
  id: string;
  name: string;
  description?: string;
};

type OrganizationContextType = {
  organizations: Organization[];
  selectedOrganizationId: string | null; 
  setSelectedOrganizationId: (orgId: string | null) => void;
  selectedOrganization: Organization | null;
  isLoadingOrganizations: boolean; 
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const ALL_ORGANIZATIONS_ID = null;

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState<boolean>(true); 

  // Fetch organizations from API
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true);
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const orgs: Organization[] = await response.json();
          setOrganizations(orgs);
          
          // Set the first organization as default if no selection
          if (orgs.length > 0 && !selectedOrganizationId) {
            setSelectedOrganizationIdState(orgs[0].id);
          }
        } else {
          console.error('Failed to fetch organizations:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setIsLoadingOrganizations(false);
      }
    };

    fetchOrganizations();
  }, [selectedOrganizationId]);

  const setSelectedOrganizationId = useCallback((orgId: string | null) => {
    setSelectedOrganizationIdState(orgId);
  }, []);

  const selectedOrganization = useMemo(() => {
    if (selectedOrganizationId === ALL_ORGANIZATIONS_ID) return null;
    return organizations.find(org => org.id === selectedOrganizationId) || null;
  }, [selectedOrganizationId, organizations]);

  const value = useMemo(() => ({
    organizations,
    selectedOrganizationId,
    setSelectedOrganizationId,
    selectedOrganization,
    isLoadingOrganizations,
  }), [organizations, selectedOrganizationId, setSelectedOrganizationId, selectedOrganization, isLoadingOrganizations]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
}
