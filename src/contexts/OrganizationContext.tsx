
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type Organization = {
  id: string;
  name: string;
};

type OrganizationContextType = {
  organizations: Organization[];
  selectedOrganizationId: string | null; // null represents "All My Organizations"
  setSelectedOrganizationId: (orgId: string | null) => void;
  selectedOrganization: Organization | null;
  isLoadingOrganizations: boolean; // In a real app, this would manage async loading
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Mock data - in a real app, this would come from an API based on user authentication
const initialMockOrganizations: Organization[] = [
  { id: "org_g9e", name: "G9e" },
  { id: "org_damion_hamilton", name: "Damion Hamilton Photographer" },
  { id: "org_other_client", name: "Another Creative Co." },
];

export const ALL_ORGANIZATIONS_ID = null; // Using null to represent all

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations] = useState<Organization[]>(initialMockOrganizations);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(ALL_ORGANIZATIONS_ID);
  const [isLoadingOrganizations] = useState<boolean>(false); // Simulate no loading for mock data

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
