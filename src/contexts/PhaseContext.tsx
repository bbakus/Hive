
"use client";

import type { ReactNode, LucideIcon } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';
import {
  FolderKanban,
  CalendarDays,
  Users,
  Cpu,
  Settings,
  LifeBuoy,
  ImageIcon, // Changed from Film for Post-Production
  PackageCheck,
  RadioTower,
  UploadCloud,
  LayoutDashboard, // For explicit Dashboard link if needed elsewhere, but not for sidebar main items
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
};

export type Phase = "Plan" | "Shoot" | "Edit" | "Deliver" | "Dashboard"; // Added Dashboard back for internal phase tracking

export const PHASES: Phase[] = ["Plan", "Shoot", "Edit", "Deliver"]; // Dashboard removed from top nav
export const AppPhasesArray: Phase[] = ["Dashboard", ...PHASES]; // For layout internal logic to know about Dashboard as a phase

export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Dashboard": [], // When Dashboard is active, sidebar main section is empty
  "Plan": [
    { href: "/projects", label: "Projects", icon: FolderKanban, matchStartsWith: true },
    { href: "/events", label: "Events Setup", icon: CalendarDays, matchStartsWith: true },
    { href: "/personnel", label: "Personnel Roster", icon: Users, matchStartsWith: true },
    { href: "/scheduler", label: "Smart Scheduler", icon: Cpu, matchStartsWith: true },
  ],
  "Shoot": [
    { href: "/shoot", label: "Live Schedule & Tracking", icon: RadioTower, matchStartsWith: true },
    { href: "/ingestion", label: "Ingestion Utility", icon: UploadCloud, matchStartsWith: true },
  ],
  "Edit": [
    { href: "/post-production", label: "Post-Production", icon: ImageIcon, matchStartsWith: true },
  ],
  "Deliver": [
    { href: "/deliverables", label: "Deliverables", icon: PackageCheck, matchStartsWith: true },
  ],
};

export const constantFooterNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, matchStartsWith: true },
  { href: "/support", label: "Support", icon: LifeBuoy, matchStartsWith: true },
];

type PhaseContextType = {
  activePhase: Phase;
  setActivePhase: (phase: Phase) => void;
  getNavItemsForPhase: (phase: Phase) => NavItem[];
  constantFooterNavItems: NavItem[];
  PHASES: Phase[]; // For TopPhaseNavigation iteration
};

const PhaseContext = createContext<PhaseContextType | undefined>(undefined);

export function PhaseProvider({ children }: { children: ReactNode }) {
  const [activePhase, setActivePhase] = useState<Phase>("Dashboard"); // Default to Dashboard

  const getNavItemsForPhase = (phase: Phase): NavItem[] => {
    return phaseNavConfigs[phase] || [];
  };

  const value = useMemo(() => ({
    activePhase,
    setActivePhase,
    getNavItemsForPhase,
    constantFooterNavItems,
    PHASES, // Expose PHASES for TopPhaseNavigation
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
