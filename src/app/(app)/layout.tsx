
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
import { PhaseProvider, usePhaseContext, type Phase, PHASES as AppPhasesArray } from "@/contexts/PhaseContext";
import { EventProvider } from "@/contexts/EventContext";
import { ProjectSelector } from "@/components/project-selector";
import { OrganizationSelector } from "@/components/organization-selector";
import { TopPhaseNavigation } from "@/components/top-phase-navigation";


function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { activePhase, getNavItemsForPhase, constantFooterNavItems } = usePhaseContext();

  const currentPhaseNavItems = getNavItemsForPhase(activePhase) || [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn("h-16 border-b border-sidebar-border", open ? "p-4" : "p-2 justify-center")}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Icons.HiveLogo className={cn("h-8 w-8 text-accent icon-glow", open ? "h-8 w-8" : "h-6 w-6")} />
          {open && <span className="text-xl font-semibold text-foreground">HIVE</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {(currentPhaseNavItems).map((item) => (
            <SidebarMenuItem key={`${activePhase}-${item.href}`}> {/* Ensure key is unique across phase changes */}
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
  const { activePhase, setActivePhase, PHASES } = usePhaseContext();
  const [mounted, setMounted] = useState(false);

  const availablePhases = PHASES || AppPhasesArray;


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let newPhaseDetermination: Phase | null = null;
    const currentPath = pathname.split('?')[0];

    // Determine phase based on top-level path segments
    if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')) {
      newPhaseDetermination = 'Dashboard';
    } else if (currentPath === '/projects' || currentPath.startsWith('/projects/')) {
      newPhaseDetermination = 'Plan';
    } else if (currentPath === '/events' && !currentPath.includes('/shots')) { 
      // Only set to 'Plan' if it's /events, not /events/.../shots
      newPhaseDetermination = 'Plan';
    } else if (currentPath === '/personnel' || currentPath.startsWith('/personnel/')) {
      newPhaseDetermination = 'Plan';
    } else if (currentPath === '/scheduler' || currentPath.startsWith('/scheduler/')) {
      newPhaseDetermination = 'Plan';
    } else if (currentPath === '/shoot' || currentPath.startsWith('/shoot/')) {
      newPhaseDetermination = 'Shoot';
    } else if (currentPath === '/post-production' || currentPath.startsWith('/post-production/')) {
      newPhaseDetermination = 'Edit';
    } else if (currentPath === '/deliverables' || currentPath.startsWith('/deliverables/')) {
      newPhaseDetermination = 'Deliver';
    }
    // For pages like /events/[eventId]/shots, /settings, /support, 
    // newPhaseDetermination remains null here. This means if the user is on such a page, 
    // the activePhase will NOT be changed by this effect if it was already set to a relevant phase.
    // It will retain the phase from which they navigated to this detailed page.

    if (newPhaseDetermination && availablePhases.includes(newPhaseDetermination) && newPhaseDetermination !== activePhase) {
      setActivePhase(newPhaseDetermination);
    }
  }, [pathname, activePhase, setActivePhase, availablePhases]);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-4">
            {mounted && <SidebarTrigger className="md:hidden" />}
            <TopPhaseNavigation />
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
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
      <OrganizationProvider>
        <ProjectProvider>
          <EventProvider>
            <PhaseProvider>
              <AppLayoutInternal>{children}</AppLayoutInternal>
            </PhaseProvider>
          </EventProvider>
        </ProjectProvider>
      </OrganizationProvider>
    </SettingsProvider>
  );
}
