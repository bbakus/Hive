
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { useProjectContext } from '@/contexts/ProjectContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from '@/contexts/OrganizationContext';
import { cn } from "@/lib/utils"; // Import cn

// Placeholder for client galleries data, eventually from a context or API
interface MockGallery {
  id: string;
  name: string;
  client: string;
  date: string;
  lastUpdated: string;
  projectId: string;
  organizationId: string;
}

const mockClientGalleries: MockGallery[] = [
  { id: "gal001", name: "Summer Fest Highlights", client: "Client A", date: "2024-07-20", lastUpdated: "2024-07-22T10:00:00Z", projectId: "proj_g9e_summit_2024", organizationId: "org_g9e" },
  { id: "gal002", name: "Tech Conference Keynotes", client: "Client B", date: "2024-09-15", lastUpdated: "2024-09-16T11:00:00Z", projectId: "proj_other_tech_conf", organizationId: "org_g9e" },
  { id: "gal003", name: "G9e Summit Live Previews", client: "Internal Stakeholder", date: "2024-10-01", lastUpdated: "2024-10-02T12:00:00Z", projectId: "proj_g9e_summit_2024", organizationId: "org_g9e" },
  { id: "gal004", name: "Product Shoot Q4", client: "Client C", date: "2024-10-15", lastUpdated: "2024-11-12T09:00:00Z", projectId: "proj_g9e_summit_2024", organizationId: "org_g9e" },
  { id: "gal005", name: "Annual Charity Ball", client: "Client D", date: "2024-11-01", lastUpdated: "2024-11-05T14:00:00Z", projectId: "proj_charity_event_2024", organizationId: "org_another_org" },
  { id: "gal006", name: "Holiday Special Shoot", client: "Client E", date: "2024-11-10", lastUpdated: "2024-11-11T16:00:00Z", projectId: "proj_g9e_summit_2024", organizationId: "org_g9e" },
  { id: "gal007", name: "Autumn Collection Launch", client: "Fashion House X", date: "2024-10-05", lastUpdated: "2024-10-05T18:00:00Z", projectId: "proj_fashion_autumn", organizationId: "org_g9e" },
  { id: "gal008", name: "G9e Summit - Day 1 Selects", client: "Marketing Team", date: "2024-10-01", lastUpdated: "2024-10-03T09:00:00Z", projectId: "proj_g9e_summit_2024", organizationId: "org_g9e" },
  { id: "gal009", name: "G9e Summit - VIP Portraits", client: "VIP Relations", date: "2024-10-02", lastUpdated: "2024-10-04T14:00:00Z", projectId: "proj_g9e_summit_2024", organizationId: "org_g9e" },
];

export default function GalleriesOverviewPage() {
  const { selectedProjectId, selectedProject } = useProjectContext();
  const { selectedOrganizationId, selectedOrganization } = useOrganizationContext();

  const displayedGalleries = useMemo(() => {
    let filtered = mockClientGalleries;

    if (selectedOrganizationId && selectedOrganizationId !== ALL_ORGANIZATIONS_ID) {
      filtered = filtered.filter(gallery => gallery.organizationId === selectedOrganizationId);
    }

    if (selectedProjectId) {
      filtered = filtered.filter(gallery => gallery.projectId === selectedProjectId);
    }

    return [...filtered]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 4);
  }, [selectedProjectId, selectedOrganizationId]); // Removed mockClientGalleries from deps as it's constant here

  const pageDescription = useMemo(() => {
    let desc = "Browse and access shared client galleries.";
    if (selectedProject) {
      desc += ` Showing the last 4 updated for project: ${selectedProject.name}.`;
    } else if (selectedOrganization) {
      desc += ` Showing the last 4 updated for organization: ${selectedOrganization.name}.`;
    } else {
      desc += ` Showing the last 4 updated across all your organizations.`;
    }
    return desc;
  }, [selectedProject, selectedOrganization]);


  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LayoutGrid className="h-8 w-8 text-accent" /> Client Galleries Overview
        </p>
        <p className="text-muted-foreground">{pageDescription}</p>
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
                  <CardHeader>
                    <CardTitle className="text-base">{gallery.name}</CardTitle>
                    <CardDescription>Client: {gallery.client} | Date: {gallery.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <img src="https://placehold.co/600x400.png?text=Gallery+Preview" alt={`Preview of ${gallery.name}`} className="w-full h-auto rounded-none" data-ai-hint="gallery preview event" />
                  </CardContent>
                  <CardContent className="pt-4"> {/* Removed border-t */}
                    <Link href={`/gallery/${gallery.id}`} passHref legacyBehavior>
                      <a className={cn(buttonVariants({ variant: 'accent', className: 'w-full' }))}>
                        View Gallery
                      </a>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No client galleries found matching your current selection.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    