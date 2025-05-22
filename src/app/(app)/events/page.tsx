
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, CalendarIcon, ListChecks } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";

// Mock data
const allEvents = [
  { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 20 },
  { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 5 },
  { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 3 },
  { id: "evt004", name: "Artist Meet & Greet", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 10 },
  { id: "evt005", name: "Closing Ceremony", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 8 },
];

export default function EventsPage() {
  const { selectedProject } = useProjectContext();

  const events = useMemo(() => {
    if (!selectedProject) {
      return allEvents; // Show all events if no project is selected
    }
    return allEvents.filter(event => event.project === selectedProject.name);
  }, [selectedProject]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events & Shot Requests</h1>
          <p className="text-muted-foreground">
            {selectedProject ? `Events for ${selectedProject.name}` : "Manage all events, shot requests, timings, and priorities."}
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Event
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-6 w-6 text-accent" /> Event List</CardTitle>
          <CardDescription>
            {selectedProject ? `Events scheduled for ${selectedProject.name}.` : "Overview of all scheduled events and their details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  {!selectedProject && <TableHead>Project</TableHead>}
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Shot Requests</TableHead>
                  <TableHead>Deliverables</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    {!selectedProject && <TableCell>{event.project}</TableCell>}
                    <TableCell>{event.date} <span className="text-muted-foreground">({event.time})</span></TableCell>
                    <TableCell>
                      <Badge variant={
                        event.priority === "High" ? "destructive" :
                        event.priority === "Critical" ? "destructive" : 
                        event.priority === "Medium" ? "secondary" : "outline"
                      }>{event.priority}</Badge>
                    </TableCell>
                    <TableCell>{event.shotRequests}</TableCell>
                    <TableCell>{event.deliverables}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent">
                        <ListChecks className="h-4 w-4" />
                        <span className="sr-only">Manage Shots</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-accent">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No events found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}.
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Shot Request Manager / Calendar View</CardTitle>
          <CardDescription>Detailed view for managing shot requests or a calendar interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A table UI or Calendar UI will allow management of events linked to specific projects, each including shot requests, timing details, priority levels and deliverables. (Coming Soon)</p>
          <img src="https://placehold.co/600x400.png" alt="Calendar View Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="calendar schedule task" />
        </CardContent>
      </Card>
    </div>
  );
}
