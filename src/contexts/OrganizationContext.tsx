
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type Organization = {
  id: string;
  name: string;
};

type OrganizationContextType = {
  organizations: Organization[];
  selectedOrganizationId: string | null; 
  setSelectedOrganizationId: (orgId: string | null) => void;
  selectedOrganization: Organization | null;
  isLoadingOrganizations: boolean; 
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const initialMockOrganizations: Organization[] = [
  { id: "org_g9e", name: "G9e Productions" },
];

export const ALL_ORGANIZATIONS_ID = null; 

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations] = useState<Organization[]>(initialMockOrganizations);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>("org_g9e"); // Default to G9e
  const [isLoadingOrganizations] = useState<boolean>(false); 

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
