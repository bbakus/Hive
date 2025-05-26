
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
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
};

export type Phase = "Dashboard" | "Plan" | "Shoot" | "Edit" | "Deliver";

export const PHASES: Phase[] = ["Dashboard", "Plan", "Shoot", "Edit", "Deliver"];

// Define sidebar navigation items for each phase
export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Dashboard": [], // No items in the sidebar when Dashboard phase is active in top nav
  "Plan": [
    { href: "/projects", label: "Projects", icon: FolderKanban, matchStartsWith: true },
    { href: "/events", label: "Events Setup", icon: CalendarDays, matchStartsWith: true },
    { href: "/personnel", label: "Personnel Roster", icon: Users, matchStartsWith: true },
    { href: "/scheduler", label: "Smart Scheduler", icon: Cpu, matchStartsWith: true },
  ],
  "Shoot": [
    { href: "/events", label: "Event Schedules", icon: CalendarDays, matchStartsWith: true },
    // Potentially add links to live shot tracking, camera feeds, etc. later
  ],
  "Edit": [
    { href: "/post-production", label: "Post-Production", icon: Film, matchStartsWith: true },
    // Links to editing bins, review portals, version tracking
  ],
  "Deliver": [
    { href: "/deliverables", label: "Deliverables", icon: ClipboardList, matchStartsWith: true },
    // Links to file uploads, client delivery portals
  ],
};

// Items always visible in the footer nav group
export const constantFooterNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, matchStartsWith: true },
  { href: "/support", label: "Support", icon: LifeBuoy, matchStartsWith: true },
];

type PhaseContextType = {
  activePhase: Phase;
  setActivePhase: (phase: Phase) => void;
  getNavItemsForPhase: (phase: Phase) => NavItem[];
  constantFooterNavItems: NavItem[];
  PHASES: Phase[]; // Add PHASES array to the context type
};

const PhaseContext = createContext<PhaseContextType | undefined>(undefined);

export function PhaseProvider({ children }: { children: ReactNode }) {
  const [activePhase, setActivePhase] = useState<Phase>("Dashboard");

  const getNavItemsForPhase = (phase: Phase): NavItem[] => {
    if (phase === "Dashboard") {
      return []; // Return empty array if Dashboard is active phase for the main sidebar section
    }
    return phaseNavConfigs[phase] || []; // Default to an empty array if config is missing
  };

  const value = useMemo(() => ({
    activePhase,
    setActivePhase,
    getNavItemsForPhase,
    constantFooterNavItems,
    PHASES, // Provide PHASES array in the context value
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
