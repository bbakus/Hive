
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

// Define a default mock user (e.g., Admin)
// const MOCK_DEFAULT_USER: User = {
//   id: "user_admin_global",
//   name: "Global Admin",
//   email: "admin@hive.com",
//   role: "Admin",
//   organizationId: "org_g9e", 
// };

const MOCK_PROJECT_MANAGER_USER: User = {
  id: "user_liam_w", // Liam Wilson's ID from personnel mock
  name: "Liam Wilson",
  email: "liam@hive.com",
  role: "Project Manager",
  organizationId: "org_g9e", // Assuming Liam is part of G9e
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch the user session here.
    // For now, we'll use a mock user after a slight delay to simulate loading.
    setTimeout(() => {
      setUser(MOCK_PROJECT_MANAGER_USER); // Changed to Project Manager
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

