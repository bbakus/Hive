
"use client";

import { useMemo, useEffect, useState } from 'react'; // Added useEffect, useState
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, CalendarDays } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useProjectContext } from '@/contexts/ProjectContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from '@/contexts/OrganizationContext';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { useEventContext, type Event } from '@/contexts/EventContext'; // Added
import { useSettingsContext } from '@/contexts/SettingsContext'; // Added
import { format, parseISO } from 'date-fns'; // Added
import { type Project } from '@/contexts/ProjectContext';
import { type Organization } from '@/contexts/OrganizationContext';

interface MockGallery {
  id: string;
}

interface MockDayGallery {
  id: string; // e.g., "2024-10-01" (YYYY-MM-DD format for easy linking)
  displayDate: string; // e.g., "October 1, 2024"
  imageUrl: string;
  imageHint: string;
  eventCount: number;
  projectId: string;
  organizationId: string;
}

export default function GalleriesOverviewPage() {
  const { projects, selectedProjectId, selectedProject, isLoadingProjects } = useProjectContext(); // Added projects, isLoadingProjects
  const { organizations, selectedOrganizationId, selectedOrganization, isLoadingOrganizations } = useOrganizationContext(); // Added organizations, isLoadingOrganizations
  const { eventsForSelectedProjectAndOrg, isLoadingEvents } = useEventContext(); // Removed events
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext(); // Added
  const [isLoadingDynamicData, setIsLoadingDynamicData] = useState(true);


  useEffect(() => {
    setIsLoadingDynamicData(isLoadingEvents || isLoadingSettings);
  }, [isLoadingEvents, isLoadingSettings]);

  const displayedGalleries = useMemo(() => {
 return []; // Placeholder: Gallery data will come from a proper API/context later
  }, [selectedProjectId, selectedOrganizationId]); // Keep dependencies for future implementation
  
  const displayedDayGalleries = useMemo(() => {
    // Always use events data from context when in demo mode
    if (isLoadingDynamicData) {
      return [];
    }

    // Group events by date
    const eventsToConsider = eventsForSelectedProjectAndOrg || []; // Kept one declaration
    
    const groupedByDate: Record<string, { events: Event[], projectId: string, organizationId: string }> = {};

    eventsToConsider.forEach(event => {
      const dateKey = event.date; // YYYY-MM-DD
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { events: [], projectId: event.projectId, organizationId: event.organizationId || "org_g9e" };
      }
      groupedByDate[dateKey].events.push(event);
    });

    return Object.entries(groupedByDate)
      .map(([dateStr, data]) => {
        let displayDate = "Invalid Date";
        try {
          displayDate = format(parseISO(dateStr), "MMMM d, yyyy");
        } catch (e) {
          console.error("Error parsing date for gallery day:", dateStr, e);
        }
        
        return {
          id: dateStr,
          displayDate: displayDate,
          imageUrl: `https://placehold.co/600x400.png`,
          imageHint: "event day overview", // Could be made more specific if needed
          eventCount: data.events.length,
          projectId: data.projectId,
          organizationId: data.organizationId,
        };
      })
      .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()); // Sort by date, most recent first

  }, [isLoadingDynamicData, useDemoData, eventsForSelectedProjectAndOrg, selectedProjectId, selectedOrganizationId]);
  

  const pageDescription = useMemo(() => {
    let desc = "Browse and access shared client galleries.";
    if (selectedProject) {
      desc += ` Showing content for project: ${selectedProject.name}.`;
    } else if (selectedOrganization) {
      desc += ` Showing content for organization: ${selectedOrganization.name}.`;
    } else {
      desc += ` Showing content across all your organizations.`;
    }
    return desc;
  }, [selectedProject, selectedOrganization]);
  
  if (isLoadingDynamicData) {
    return (
         <div className="flex flex-col gap-8">
            <div>
                <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <LayoutGrid className="h-8 w-8 text-accent" /> Client Galleries Overview
                </p>
                <p className="text-muted-foreground mt-1">Loading gallery data...</p>
            </div>
            <Card className="border-0">
                 <CardHeader><p className="text-lg font-semibold">Recently Updated Galleries</p></CardHeader>
                <CardContent><p>Loading...</p></CardContent>
            </Card>
             <Card className="border-0">
                <CardHeader><p className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Browse by Day</p></CardHeader>
                <CardContent><p>Loading days...</p></CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LayoutGrid className="h-8 w-8 text-accent" /> Client Galleries Overview
        </p>
        <p className="text-muted-foreground mt-1">{pageDescription}</p>
      </div>

      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold">Recently Updated Galleries</p>
          <div className="text-sm text-muted-foreground">
            A list of the 4 most recently updated client-facing galleries matching your current context. Click to view.
          </div>
        </CardHeader>
        <CardContent>
          {displayedGalleries.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedGalleries.map(gallery => (
                <Card key={gallery.id} className="hover:shadow-md transition-shadow border-0">
 <CardHeader> {/* Placeholder for future gallery details */}
                  </CardHeader>
                  <CardContent>
                    <Image src="https://placehold.co/600x400.png" alt={`Preview of ${gallery.name}`} width={600} height={400} className="w-full h-auto rounded-none" data-ai-hint="gallery preview event" />
                  </CardContent>
                  <CardContent className="pt-4">
                    <Link href={`/gallery/${gallery.id}`} passHref legacyBehavior>
                      <a className={cn(buttonVariants({ variant: 'ghost', className: 'w-full text-accent hover:text-accent/90' }))}>
                        View Gallery
                      </a>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
 ) : (
            <p className="text-muted-foreground text-center py-8">
              No client galleries found matching your current selection for "Recently Updated".
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Browse by Day
          </p>
          <div className="text-sm text-muted-foreground">
            Select a day to view all associated event galleries from the demo data.
          </div>
        </CardHeader>
        <CardContent>
          {displayedDayGalleries.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedDayGalleries.map(day => (
                <Link key={day.id} href={`/galleries/day/${day.id}`} passHref legacyBehavior>
                  <a className="block hover:no-underline">
                    <Card className="hover:shadow-md transition-shadow border-0 h-full flex flex-col">
                      <CardContent className="p-0">
                        <Image 
                            src={day.imageUrl} 
                            alt={`Events from ${day.displayDate}`} 
                            width={600} height={300} 
                            className="w-full h-48 object-cover rounded-none" 
                            data-ai-hint={day.imageHint} 
                        />
                      </CardContent>
                      <CardHeader className="flex-grow">
                        <CardTitle className="text-base">{day.displayDate}</CardTitle>
                        <CardDescription>{day.eventCount} event(s) this day</CardDescription>
                      </CardHeader>
                       <CardContent className="pt-2 pb-4">
                          <span className={cn(buttonVariants({ variant: 'ghost', className: 'w-full text-accent hover:text-accent/90 justify-start' }))}>
                            View Day's Galleries
                          </span>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
             <p className="text-muted-foreground text-center py-8">
              {useDemoData ? "No event days found in the demo data matching your current project/organization selection." : "Demo data is disabled, or no days with events to display."}
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
    

    