
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react"; 
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
import { ProjectProvider } from "@/contexts/ProjectContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PhaseProvider, usePhaseContext, constantFooterNavItems, type Phase } from "@/contexts/PhaseContext"; 
import { ProjectSelector } from "@/components/project-selector";
import { TopPhaseNavigation } from "@/components/top-phase-navigation";


function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { activePhase, getNavItemsForPhase } = usePhaseContext();

  const currentPhaseNavItems = getNavItemsForPhase(activePhase);

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
          {/* constantTopNavItems is handled by ensuring Dashboard phase shows its items */}
          {currentPhaseNavItems.map((item) => (
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
           {constantFooterNavItems.map((item) => (
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

// This internal component can safely use usePhaseContext because its parent (AppLayout) wraps it in PhaseProvider
function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activePhase, setActivePhase } = usePhaseContext();

  useEffect(() => {
    let determinedPhase: Phase | null = null;

    // Determine the "primary" phase for the current path.
    // This ensures that direct navigation or page refresh sets the top phase navigation correctly.
    // User clicks on TopPhaseNavigation will also directly call setActivePhase.
    if (pathname.startsWith('/dashboard')) {
      determinedPhase = 'Dashboard';
    } else if (pathname.startsWith('/projects') || pathname.startsWith('/personnel') || pathname.startsWith('/scheduler')) {
      determinedPhase = 'Plan';
    } else if (pathname.startsWith('/events')) { 
      // Default /events and its sub-routes (like /events/[id]/shots) to "Plan" phase context.
      // If the user manually clicks "Shoot" in top nav, activePhase becomes "Shoot", and sidebar correctly shows "Events".
      // Upon refresh of /events, this logic ensures it defaults back to "Plan" for consistency.
      determinedPhase = 'Plan';
    } else if (pathname.startsWith('/post-production')) {
      determinedPhase = 'Edit';
    } else if (pathname.startsWith('/deliverables')) {
      determinedPhase = 'Deliver';
    }
    // Utility pages like /settings or /support do not have a primary phase in the top navigation,
    // so they don't change the activePhase of the content area.

    if (determinedPhase && determinedPhase !== activePhase) {
      setActivePhase(determinedPhase);
    }
  }, [pathname, activePhase, setActivePhase]); // activePhase is included to prevent re-setting if already correct

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <TopPhaseNavigation />
          </div>
          <div className="flex-1"></div> {/* Spacer */}
          <div className="flex items-center gap-4"> {/* Container for right-aligned items */}
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
      <ProjectProvider>
        <PhaseProvider> {/* PhaseProvider wraps components that need phase context */}
          <AppLayoutInternal>{children}</AppLayoutInternal>
        </PhaseProvider>
      </ProjectProvider>
    </SettingsProvider>
  );
}
