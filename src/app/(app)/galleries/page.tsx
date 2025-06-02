
"use client";

import { useMemo } from 'react'; // Import useMemo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Placeholder for client galleries data, eventually from a context or API
interface MockGallery {
  id: string;
  name: string;
  client: string;
  date: string;
  lastUpdated: string; // Added lastUpdated field
}

const mockClientGalleries: MockGallery[] = [
  { id: "gal001", name: "Summer Fest Highlights", client: "Client A", date: "2024-07-20", lastUpdated: "2024-07-22T10:00:00Z" },
  { id: "gal002", name: "Tech Conference Keynotes", client: "Client B", date: "2024-09-15", lastUpdated: "2024-09-16T11:00:00Z" },
  { id: "gal003", name: "G9e Summit Live Previews", client: "Internal Stakeholder", date: "2024-10-01", lastUpdated: "2024-10-02T12:00:00Z" },
  { id: "gal004", name: "Product Shoot Q4", client: "Client C", date: "2024-10-15", lastUpdated: "2024-11-12T09:00:00Z" },
  { id: "gal005", name: "Annual Charity Ball", client: "Client D", date: "2024-11-01", lastUpdated: "2024-11-05T14:00:00Z" },
  { id: "gal006", name: "Holiday Special Shoot", client: "Client E", date: "2024-11-10", lastUpdated: "2024-11-11T16:00:00Z" },
  { id: "gal007", name: "Autumn Collection Launch", client: "Fashion House X", date: "2024-10-05", lastUpdated: "2024-10-05T18:00:00Z" },
];

export default function GalleriesOverviewPage() {
  const displayedGalleries = useMemo(() => {
    return [...mockClientGalleries]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 4);
  }, []); // Dependency array is empty as mockClientGalleries is static here

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LayoutGrid className="h-8 w-8 text-accent" /> Client Galleries Overview
        </p>
        <p className="text-muted-foreground">Browse and access shared client galleries. Showing the last 4 updated.</p>
      </div>

      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold">Recently Updated Galleries</p>
          <div className="text-sm text-muted-foreground">
            A list of the 4 most recently updated client-facing galleries. Click to view.
          </div>
        </CardHeader>
        <CardContent>
          {displayedGalleries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"> {/* Adjusted grid for potentially 4 items */}
              {displayedGalleries.map(gallery => (
                <Card key={gallery.id} className="hover:shadow-md transition-shadow border-0">
                  <CardHeader>
                    <CardTitle className="text-base">{gallery.name}</CardTitle>
                    <CardDescription>Client: {gallery.client} | Date: {gallery.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <img src="https://placehold.co/600x400.png?text=Gallery+Preview" alt={`Preview of ${gallery.name}`} className="w-full h-auto rounded-none" data-ai-hint="gallery preview event" />
                  </CardContent>
                  <CardContent className="border-t pt-4">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/gallery/${gallery.id}`}>View Gallery</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No client galleries have been created or shared yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
