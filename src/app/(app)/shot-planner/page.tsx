
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ShotPlannerPage() {
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (eventIdFromQuery) {
      setSelectedEventId(eventIdFromQuery);
    } else {
      setSelectedEventId(null);
    }
  }, [eventIdFromQuery]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <p className="text-muted-foreground">Plan and organize all shots for your projects and events.</p>
        {selectedEventId && (
          <p className="mt-2 text-sm text-accent">
            Currently planning shots for Event ID: {selectedEventId}
          </p>
        )}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Shot Planning & Organization Tools</CardTitle>
          <CardDescription>
            {selectedEventId 
              ? `Detailed shot list management for Event ID: ${selectedEventId}. This section is under development.`
              : "Global shot planning and organization. This section is under development."
            }
            Future features may include:
            </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Comprehensive CRUD operations for shot requests for the selected event.</li>
            <li>Ability to assign personnel, set priorities, types, statuses, notes, etc.</li>
            <li>Reordering shots, grouping shots by scene or location.</li>
            <li>Visual storyboarding tools.</li>
            <li>Integration with call sheets or production schedules.</li>
            <li>Visual dashboards for shot completion status across an entire project or event.</li>
            <li>If no event is selected, provide a global view of all shots or a project-based shot overview.</li>
          </ul>
          <img 
            src="https://placehold.co/600x400.png" 
            alt="Shot Planning Placeholder" 
            className="w-full h-auto mt-4 rounded-none"
            data-ai-hint="storyboard planning interface"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    