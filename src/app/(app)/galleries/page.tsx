
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Placeholder for client galleries data, eventually from a context or API
const mockClientGalleries = [
  { id: "gal001", name: "Summer Fest Highlights", client: "Client A", date: "2024-07-20" },
  { id: "gal002", name: "Tech Conference Keynotes", client: "Client B", date: "2024-09-15" },
  { id: "gal003", name: "G9e Summit Live Previews", client: "Internal Stakeholder", date: "2024-10-01" },
];

export default function GalleriesOverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LayoutGrid className="h-8 w-8 text-accent" /> Client Galleries Overview
        </p>
        <p className="text-muted-foreground">Browse and access all shared client galleries.</p>
      </div>

      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold">All Galleries</p>
          <div className="text-sm text-muted-foreground">
            A list of all client-facing galleries. Click to view.
          </div>
        </CardHeader>
        <CardContent>
          {mockClientGalleries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockClientGalleries.map(gallery => (
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
