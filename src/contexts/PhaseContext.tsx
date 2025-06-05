
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
  Zap, // Added Zap for Highlights
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchStartsWith?: boolean;
  type?: 'link' | 'accordion'; // New property to differentiate
  children?: NavItem[];      // New property for sub-items
};

export type Phase = "Plan" | "Shoot" | "Edit" | "Deliver" | "Dashboard" | "View";

export const PHASES: Phase[] = ["Plan", "Shoot", "Edit", "Deliver", "View"];
export const AppPhasesArray: Phase[] = ["Dashboard", ...PHASES];

export const phaseNavConfigs: Record<Phase, NavItem[]> = {
  "Dashboard": [], 
  "Plan": [
    { href: "/projects", label: "Projects", icon: FolderKanban, matchStartsWith: true, type: 'link' },
    { href: "/events", label: "Events Setup", icon: CalendarDays, matchStartsWith: true, type: 'link' },
    { href: "/shot-planner", label: "Shot Planner", icon: ListChecks, matchStartsWith: true, type: 'link' },
    { href: "/personnel", label: "Personnel Roster", icon: Users, matchStartsWith: true, type: 'link' },
    { href: "/scheduler", label: "Smart Scheduler", icon: Cpu, matchStartsWith: true, type: 'link' },
  ],
  "Shoot": [
    { href: "/shoot", label: "Live Schedule & Tracking", icon: RadioTower, matchStartsWith: true, type: 'link' },
  ],
  "Edit": [
    { href: "/post-production", label: "Post-Production", icon: ImageIcon, matchStartsWith: true, type: 'link' },
    { href: "/ingestion", label: "Ingestion Utility", icon: UploadCloud, matchStartsWith: true, type: 'link' },
  ],
  "Deliver": [
    { href: "/deliverables", label: "Deliverables & Galleries", icon: PackageCheck, matchStartsWith: true, type: 'link' },
    { href: "/deliver/organize", label: "Organize Galleries", icon: FolderTree, matchStartsWith: true, type: 'link' }, 
  ],
  "View": [
    { href: "/galleries", label: "All Galleries Overview", icon: LayoutGrid, matchStartsWith: true, type: 'link' },
    { href: "/gallery/mockId?type=highlights", label: "Highlights Gallery", icon: Zap, type: 'link', matchStartsWith: false }, // Added Highlights Gallery
    {
      href: "#day1_events_accordion", 
      label: "Day 1 Events",
      icon: CalendarDays, 
      type: 'accordion',
      children: [
        { href: "/gallery/mockId?event=Day1Breakfast", label: "Grand Opening Breakfast", icon: Star, type: 'link', matchStartsWith: false },
        { href: "/gallery/mockId?event=Day1Keynote", label: "Keynote Speech", icon: Star, type: 'link', matchStartsWith: false },
      ]
    },
    {
      href: "#day2_events_accordion",
      label: "Day 2 Events",
      icon: CalendarDays, 
      type: 'accordion',
      children: [
        { href: "/gallery/mockId?event=Day2Workshop", label: "Workshop ABC", icon: Star, type: 'link', matchStartsWith: false },
        { href: "/gallery/mockId?event=Day2Panel", label: "Expert Panel Discussion", icon: Star, type: 'link', matchStartsWith: false },
      ]
    },
  ],
};

export const constantFooterNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, matchStartsWith: true, type: 'link' },
  { href: "/support", label: "Support", icon: LifeBuoy, matchStartsWith: true, type: 'link' },
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
