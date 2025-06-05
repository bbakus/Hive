
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PhaseProvider, usePhaseContext, type Phase, AppPhasesArray } from "@/contexts/PhaseContext";
import { EventProvider } from "@/contexts/EventContext";
import { UserProvider } from "@/contexts/UserContext"; // Import UserProvider
import { ProjectSelector } from "@/components/project-selector";
import { OrganizationSelector } from "@/components/organization-selector";
import { LocalAgentStatusIndicator } from "@/components/local-agent-status-indicator";
import { LocalAgentProvider } from "@/contexts/LocalAgentContext";
import { TopPhaseNavigation } from "@/components/top-phase-navigation";


function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { activePhase, getNavItemsForPhase, constantFooterNavItems } = usePhaseContext();

  const currentPhaseNavItems = getNavItemsForPhase(activePhase) || [];


  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className={cn("h-16 border-b border-sidebar-border", open ? "p-4" : "p-2 justify-center")}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Icons.HiveLogo className={cn("text-accent", open ? "h-8 w-8" : "h-6 w-6")} />
          {open && <span className="text-xl font-semibold text-foreground">HIVE</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {(currentPhaseNavItems).map((item) => (
            <SidebarMenuItem key={`${activePhase}-${item.href}`}>
               <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={item.matchStartsWith ? pathname.startsWith(item.href) : pathname === item.href}
                  tooltip={{children: item.label, side: "right", align: "center", className: "bg-popover text-popover-foreground"}}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
           {(constantFooterNavItems || []).map((item) => (
            <SidebarMenuItem key={item.href}>
               <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={item.matchStartsWith ? pathname.startsWith(item.href) : pathname === item.href}
                  tooltip={{children: item.label, side: "right", align: "center", className: "bg-popover text-popover-foreground"}}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activePhase, setActivePhase, PHASES: availableTopPhases } = usePhaseContext(); // PHASES is for top nav
  const [mounted, setMounted] = useState(false);

  const allPossiblePhases = AppPhasesArray; // For internal logic including Dashboard

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let determinedPhase: Phase | null = null;
    const currentPath = pathname.split('?')[0]; // Ignore query params

    if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')) {
      determinedPhase = 'Dashboard';
    } else if (currentPath === '/projects' || currentPath.startsWith('/projects/')) {
      determinedPhase = 'Plan';
    } else if (currentPath === '/events' || currentPath.startsWith('/events/')) {
      if (activePhase === "Shoot" && currentPath.includes('/shots')) {
        determinedPhase = "Shoot";
      } else {
        determinedPhase = "Plan";
      }
    } else if (currentPath === '/shot-planner' || currentPath.startsWith('/shot-planner/')) {
        determinedPhase = 'Plan';
    } else if (currentPath === '/personnel' || currentPath.startsWith('/personnel/')) {
      determinedPhase = 'Plan';
    } else if (currentPath === '/scheduler' || currentPath.startsWith('/scheduler/')) {
      determinedPhase = 'Plan';
    } else if (currentPath === '/shoot' || currentPath.startsWith('/shoot/')) {
      determinedPhase = 'Shoot';
    } else if (currentPath === '/ingestion' || currentPath.startsWith('/ingestion/')) {
      determinedPhase = 'Edit';
    } else if (currentPath === '/post-production' || currentPath.startsWith('/post-production/')) {
      determinedPhase = 'Edit';
    } else if (currentPath === '/deliverables' || currentPath.startsWith('/deliverables/')) {
      determinedPhase = 'Deliver';
    } else if (currentPath === '/deliver/organize' || currentPath.startsWith('/deliver/organize/')) {
      determinedPhase = 'Deliver';
    } else if (currentPath === '/galleries' || currentPath.startsWith('/galleries/') || currentPath.startsWith('/gallery/')) {
      determinedPhase = 'View';
    } else if (currentPath === '/settings' || currentPath.startsWith('/settings/')) {
       determinedPhase = activePhase || 'Dashboard';
    } else if (currentPath === '/support' || currentPath.startsWith('/support/')) {
       determinedPhase = activePhase || 'Dashboard';
    } else {
      if (!currentPath.startsWith('/')) {
        determinedPhase = 'Dashboard';
      }
    }

    if (determinedPhase && allPossiblePhases.includes(determinedPhase) && determinedPhase !== activePhase) {
      setActivePhase(determinedPhase);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activePhase, setActivePhase, allPossiblePhases]);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-4">
            {mounted && <SidebarTrigger className="md:hidden" />}
            <TopPhaseNavigation />
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LocalAgentStatusIndicator />
            <OrganizationSelector />
            <ProjectSelector />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <LocalAgentProvider>
        <UserProvider> {/* Wrap with UserProvider */}
          <OrganizationProvider>
            <ProjectProvider>
              <EventProvider>
                <PhaseProvider>
                  <AppLayoutInternal>{children}</AppLayoutInternal>
                </PhaseProvider>
              </EventProvider>
            </ProjectProvider>
          </OrganizationProvider>
        </UserProvider>
      </LocalAgentProvider>
    </SettingsProvider>
  );
}
