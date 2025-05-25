
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import type { LucideIcon } from "lucide-react"; // Keep this if NavItem still uses it
import { ProjectProvider } from "@/contexts/ProjectContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PhaseProvider, usePhaseContext, constantTopNavItems, constantFooterNavItems, type NavItem } from "@/contexts/PhaseContext";
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
          {constantTopNavItems.map((item) => (
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


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ProjectProvider>
        <PhaseProvider> {/* PhaseProvider wraps components that need phase context */}
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset>
              <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
                <div className="flex items-center gap-4"> {/* Container for left-aligned items */}
                  <SidebarTrigger className="md:hidden" />
                  <TopPhaseNavigation />
                </div>
                <div className="flex-1"></div> {/* Spacer */}
                <div className="flex items-center gap-4"> {/* Container for right-aligned items */}
                  <ProjectSelector />
                  <UserNav />
                </div>
              </header>
              {/* TopPhaseNavigation was here, now moved into the header */}
              <main className="flex-1 p-4 sm:p-6 md:p-8">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </PhaseProvider>
      </ProjectProvider>
    </SettingsProvider>
  );
}
