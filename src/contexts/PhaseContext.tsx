
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
  Video as VideoIcon,
  Camera,
  ListChecks,
  PackageCheck,
  RadioTower,
  UploadCloud, // Added for Ingestion
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
};

export type Phase = "Dashboard" | "Plan" | "Shoot" | "Edit" | "Deliver";

export const PHASES: Phase[] = ["Dashboard", "Plan", "Shoot", "Edit", "Deliver"];

export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Dashboard": [],
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
    { href: "/post-production", label: "Post-Production", icon: Film, matchStartsWith: true },
  ],
  "Deliver": [
    { href: "/deliverables", label: "Deliverables", icon: ClipboardList, matchStartsWith: true },
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
  PHASES: Phase[];
};

const PhaseContext = createContext<PhaseContextType | undefined>(undefined);

export function PhaseProvider({ children }: { children: ReactNode }) {
  const [activePhase, setActivePhase] = useState<Phase>("Dashboard");

  const getNavItemsForPhase = (phase: Phase): NavItem[] => {
    return phaseNavConfigs[phase] || [];
  };

  const value = useMemo(() => ({
    activePhase,
    setActivePhase,
    getNavItemsForPhase,
    constantFooterNavItems,
    PHASES,
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
