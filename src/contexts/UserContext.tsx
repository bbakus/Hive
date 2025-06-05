
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';

// Define available user roles
export type UserRole = "HIVE" | "Admin" | "Project Manager" | "Client" | "Photographer" | "Editor" | "Guest";

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  organizationId?: string; 
  // Add other relevant user fields here, e.g., avatarUrl
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void; // For future login/logout
  isLoadingUser: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock Users - Keep these definitions for easy switching during development
const MOCK_HIVE_USER: User = {
  id: "user_hive_super_admin",
  name: "HIVE Super Admin",
  email: "super@hive.com",
  role: "HIVE",
  organizationId: "org_g9e", // Can be a default or handled specially
};

const MOCK_ADMIN_USER: User = {
  id: "user_admin_global",
  name: "Global Admin",
  email: "admin@hive.com",
  role: "Admin",
  organizationId: "org_g9e",
};

const MOCK_PROJECT_MANAGER_USER: User = {
  id: "user_liam_w", // Liam Wilson's ID from personnel mock
  name: "Liam Wilson",
  email: "liam@hive.com",
  role: "Project Manager",
  organizationId: "org_g9e",
};

const MOCK_CLIENT_USER: User = {
  id: "user_client_liaison", // Client Liaison's ID from personnel mock
  name: "Client Liaison (PBCC)",
  email: "client@pbcc.com",
  role: "Client",
  organizationId: "org_g9e", 
};

const MOCK_PHOTOGRAPHER_USER: User = {
  id: "user_maria_s", // Maria Sanchez's ID from personnel mock
  name: "Maria Sanchez",
  email: "maria@hive.com",
  role: "Photographer",
  organizationId: "org_g9e",
};

const MOCK_EDITOR_USER: User = {
  id: "user_ava_m", // Ava Miller's ID from personnel mock
  name: "Ava Miller",
  email: "ava@hive.com",
  role: "Editor",
  organizationId: "org_g9e",
};

// --- End of Mock User Definitions ---

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch the user session here.
    // For now, we'll use a mock user after a slight delay to simulate loading.
    setTimeout(() => {
      setUser(MOCK_HIVE_USER); // Switch to HIVE User
      setIsLoadingUser(false);
    }, 200); // Simulate a short loading period
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    isLoadingUser,
  }), [user, isLoadingUser]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
