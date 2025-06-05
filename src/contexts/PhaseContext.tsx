
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
  ImageIcon,
  PackageCheck,
  RadioTower,
  UploadCloud,
  ListChecks,
  LayoutGrid,
  FolderTree, 
  Star,
  Zap,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
};

export type Phase = "Plan" | "Shoot" | "Edit" | "Deliver" | "Dashboard" | "View";

export const PHASES: Phase[] = ["Plan", "Shoot", "Edit", "Deliver", "View"];
export const AppPhasesArray: Phase[] = ["Dashboard", ...PHASES];

export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Dashboard": [], 
  "Plan": [
    { href: "/projects", label: "Projects", icon: FolderKanban, matchStartsWith: true },
    { href: "/events", label: "Events Setup", icon: CalendarDays, matchStartsWith: true },
    { href: "/shot-planner", label: "Shot Planner", icon: ListChecks, matchStartsWith: true },
    { href: "/personnel", label: "Personnel Roster", icon: Users, matchStartsWith: true },
    { href: "/scheduler", label: "Smart Scheduler", icon: Cpu, matchStartsWith: true },
  ],
  "Shoot": [
    { href: "/shoot", label: "Live Schedule & Tracking", icon: RadioTower, matchStartsWith: true },
  ],
  "Edit": [
    { href: "/post-production", label: "Post-Production", icon: ImageIcon, matchStartsWith: true },
    { href: "/ingestion", label: "Ingestion Utility", icon: UploadCloud, matchStartsWith: true },
  ],
  "Deliver": [
    { href: "/deliverables", label: "Deliverables & Galleries", icon: PackageCheck, matchStartsWith: true },
    { href: "/deliver/organize", label: "Organize Galleries", icon: FolderTree, matchStartsWith: true }, 
  ],
  "View": [
    { href: "/galleries", label: "All Galleries Overview", icon: LayoutGrid, matchStartsWith: true },
    // Mocked structure for Day 1 (using existing icons for now)
    { href: "#day1_label", label: "Day 1 (Sample Events)", icon: CalendarDays, matchStartsWith: false }, // Non-functional, acts as visual header
    { href: "/gallery/event_day1_breakfast", label: "  - Grand Opening Breakfast", icon: Star, matchStartsWith: false },
    { href: "/gallery/event_day1_keynote", label: "  - Keynote Speech", icon: Star, matchStartsWith: false },
    // Mocked structure for Day 2
    { href: "#day2_label", label: "Day 2 (Sample Events)", icon: CalendarDays, matchStartsWith: false }, // Non-functional
    { href: "/gallery/event_day2_workshop", label: "  - Workshop ABC", icon: Star, matchStartsWith: false },
    { href: "/gallery/event_day2_panel", label: "  - Expert Panel Discussion", icon: Star, matchStartsWith: false },
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
    if (phase === "Dashboard") return []; 
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
