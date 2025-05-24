
"use client";

import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, PlusCircle } from 'lucide-react';
import type { Event } from '../page'; // Import Event type from parent page

// Re-using initialEvents from parent for simplicity in this example.
// In a real app, you'd fetch this data or have it in a global state/context.
const initialEventsForShotPage: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 20 },
    { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", projectId: "proj002", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 5 },
    { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", projectId: "proj003", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 3 },
    { id: "evt004", name: "Artist Meet & Greet", project: "Summer Music Festival 2024", projectId: "proj001", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 10 },
    { id: "evt005", name: "Closing Ceremony", project: "Tech Conference X", projectId: "proj002", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 8 },
];


export default function ShotListPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  
  // In a real app, fetch event details based on eventId
  // For now, find it in the mock data
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      const foundEvent = initialEventsForShotPage.find(e => e.id === eventId);
      setEvent(foundEvent || null);
      setIsLoading(false);
    }
  }, [eventId]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading event details...</div>;
  }

  if (!event) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-xl text-muted-foreground">Event not found.</p>
            <Button asChild variant="outline">
                <Link href="/events">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Events
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Camera className="h-8 w-8 text-accent"/> Shot List for: {event.name}
        </h1>
        <p className="text-muted-foreground">Project: {event.project} | Date: {event.date} | Time: {event.time}</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Shot Requests</CardTitle>
            <CardDescription>Define and track all required shots for this event.</CardDescription>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2 h-5 w-5" />
            Add Shot Request (Coming Soon)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Camera size={48} className="mx-auto mb-4" />
            <p className="text-lg font-medium">Shot request management features are under development.</p>
            <p>Soon you'll be able to add, edit, and track specific shots, assign personnel, and manage equipment needs right here.</p>
            <img src="https://placehold.co/600x300.png" alt="Shot List Placeholder" className="w-full max-w-md h-auto mt-6 rounded-md mx-auto" data-ai-hint="camera shot list film" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
