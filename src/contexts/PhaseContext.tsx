
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
  Target, // Example for future
  Edit3,  // Example for future
  Send    // Example for future
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
};

export type Phase = "Plan" | "Shoot" | "Edit" | "Deliver";

export const PHASES: Phase[] = ["Plan", "Shoot", "Edit", "Deliver"];

export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Plan": [
    { href: "/projects", label: "Projects", icon: FolderKanban, matchStartsWith: true },
    { href: "/events", label: "Events Setup", icon: CalendarDays, matchStartsWith: true },
    { href: "/personnel", label: "Personnel Roster", icon: Users, matchStartsWith: true },
    { href: "/scheduler", label: "Smart Scheduler", icon: Cpu, matchStartsWith: true },
  ],
  "Shoot": [
    { href: "/events", label: "Event Schedules", icon: CalendarDays, matchStartsWith: true }, // Links to /events, user navigates to block/shot lists
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

// Items always visible at the top of the main nav group
export const constantTopNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, matchStartsWith: true },
];

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
  const [activePhase, setActivePhase] = useState<Phase>("Plan");

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
