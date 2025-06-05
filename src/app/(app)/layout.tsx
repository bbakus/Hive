
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
import { PhaseProvider, usePhaseContext, type Phase, AppPhasesArray, type NavItem } from "@/contexts/PhaseContext";
import { EventProvider } from "@/contexts/EventContext";
import { UserProvider } from "@/contexts/UserContext"; // Import UserProvider
import { ProjectSelector } from "@/components/project-selector";
import { OrganizationSelector } from "@/components/organization-selector";
import { LocalAgentStatusIndicator } from "@/components/local-agent-status-indicator";
import { LocalAgentProvider } from "@/contexts/LocalAgentContext";
import { TopPhaseNavigation } from "@/components/top-phase-navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


function AppSidebar() {
  const pathname = usePathname();
  const { open, setOpen, state: sidebarState } = useSidebar(); // Added sidebarState
  const { activePhase, getNavItemsForPhase, constantFooterNavItems } = usePhaseContext();

  const currentPhaseNavItems = getNavItemsForPhase(activePhase) || [];

  const renderNavItems = (items: NavItem[], currentPathname: string, currentActivePhase: Phase) => {
    return items.map((item) => {
      if (item.type === 'accordion' && item.children) {
        // Ensure item.label is a string for AccordionItem value
        const accordionValue = typeof item.label === 'string' ? item.label : item.href;
        return (
          <AccordionItem value={accordionValue} key={`${currentActivePhase}-${item.href}-acc`} className="border-none list-none">
            <AccordionTrigger
              className={cn(
                "flex w-full items-center justify-between gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
                "hover:no-underline",
                // SidebarMenuButton specific classes for consistent look
                "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2",
                // No specific active state for accordion trigger for now, or needs custom logic
              )}
            >
              <div className="flex items-center gap-2 [&>svg]:size-5 [&>svg]:shrink-0">
                <item.icon />
                {sidebarState === 'expanded' && <span>{item.label}</span>}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-0 pl-4">
              <SidebarMenu className="border-l border-sidebar-border ml-[7px] pl-2 py-1">
                {item.children.map(childItem => (
                  <SidebarMenuItem key={`${currentActivePhase}-${childItem.href}-child`}>
                    <Link href={childItem.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        asChild
                        size="sm" // Smaller size for sub-items
                        isActive={childItem.matchStartsWith ? currentPathname.startsWith(childItem.href) : currentPathname === childItem.href}
                        tooltip={{ children: childItem.label, side: "right", align: "center", className: "bg-popover text-popover-foreground" }}
                         className="!h-7 [&>svg]:!size-4" // Further style tuning
                      >
                        <a>
                          <childItem.icon />
                           {sidebarState === 'expanded' && <span>{childItem.label}</span>}
                        </a>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </AccordionContent>
          </AccordionItem>
        );
      } else { // 'link' type or undefined (default to link)
        return (
          <SidebarMenuItem key={`${currentActivePhase}-${item.href}-link`}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                isActive={item.matchStartsWith ? currentPathname.startsWith(item.href) : currentPathname === item.href}
                tooltip={{ children: item.label, side: "right", align: "center", className: "bg-popover text-popover-foreground" }}
              >
                <a>
                  <item.icon className="h-5 w-5" />
                  {sidebarState === 'expanded' && <span>{item.label}</span>}
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      }
    });
  };


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
        <Accordion type="multiple" className="w-full">
          <SidebarMenu>
            {renderNavItems(currentPhaseNavItems, pathname, activePhase)}
          </SidebarMenu>
        </Accordion>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
         {/* Footer items remain non-accordion for now */}
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
                    {sidebarState === 'expanded' && <span>{item.label}</span>}
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
