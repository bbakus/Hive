
"use client";

import type { ReactNode, LucideIcon } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Users,
  Cpu,
  Settings,
  LifeBuoy,
  Film,
  ClipboardList,
  // Target, // Example for future
  // Edit3,  // Example for future
  // Send    // Example for future
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
};

// Add "Dashboard" as a Phase
export type Phase = "Dashboard" | "Plan" | "Shoot" | "Edit" | "Deliver";

// Add "Dashboard" to the PHASES array, typically first
export const PHASES: Phase[] = ["Dashboard", "Plan", "Shoot", "Edit", "Deliver"];

// Define sidebar navigation items for each phase
export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Dashboard": [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, matchStartsWith: true },
  ],
  "Plan": [
    { href: "/projects", label: "Projects", icon: FolderKanban, matchStartsWith: true },
    { href: "/events", label: "Events Setup", icon: CalendarDays, matchStartsWith: true },
    { href: "/personnel", label: "Personnel Roster", icon: Users, matchStartsWith: true },
    { href: "/scheduler", label: "Smart Scheduler", icon: Cpu, matchStartsWith: true },
  ],
  "Shoot": [
    // "Events" is a good entry point for seeing schedules during the "Shoot" phase.
    // Users can navigate to specific event shot lists from there.
    { href: "/events", label: "Event Schedules", icon: CalendarDays, matchStartsWith: true },
    // { href: "/shot-tracker", label: "Active Shot Tracker", icon: Target, matchStartsWith: true }, // Example for future
  ],
  "Edit": [
    { href: "/post-production", label: "Post-Production", icon: Film, matchStartsWith: true },
    // { href: "/editing-board", label: "Editing Board", icon: Edit3, matchStartsWith: true }, // Example for future
  ],
  "Deliver": [
    { href: "/deliverables", label: "Deliverables", icon: ClipboardList, matchStartsWith: true },
    // { href: "/client-review", label: "Client Review", icon: Send, matchStartsWith: true }, // Example for future
  ],
};

// Items always visible at the top of the main nav group (now empty)
export const constantTopNavItems: NavItem[] = [];

// Items always visible in the footer nav group
export const constantFooterNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, matchStartsWith: true },
  { href: "/support", label: "Support", icon: LifeBuoy, matchStartsWith: true },
];

type PhaseContextType = {
  activePhase: Phase;
  setActivePhase: (phase: Phase) => void;
  getNavItemsForPhase: (phase: Phase) => NavItem[];
};

const PhaseContext = createContext<PhaseContextType | undefined>(undefined);

export function PhaseProvider({ children }: { children: ReactNode }) {
  // Default active phase is now "Dashboard"
  const [activePhase, setActivePhase] = useState<Phase>("Dashboard");

  const getNavItemsForPhase = (phase: Phase): NavItem[] => {
    return phaseNavConfigs[phase] || [];
  };

  const value = useMemo(() => ({
    activePhase,
    setActivePhase,
    getNavItemsForPhase,
  }), [activePhase]);

  return (
    <PhaseContext.Provider value={value}>
      {children}
    </PhaseContext.Provider>
  );
}

export function usePhaseContext() {
  const context = useContext(PhaseContext);
  if (context === undefined) {
    throw new Error('usePhaseContext must be used within a PhaseProvider');
  }
  return context;
}
