
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

const MOCK_PHOTOGRAPHER_USER: User = {
  id: "user_maria_s", // Maria Sanchez's ID from personnel mock
  name: "Maria Sanchez",
  email: "maria@hive.com",
  role: "Photographer",
  organizationId: "org_g9e", // Assuming Maria is part of G9e
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch the user session here.
    // For now, we'll use a mock user after a slight delay to simulate loading.
    setTimeout(() => {
      setUser(MOCK_PHOTOGRAPHER_USER); 
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

