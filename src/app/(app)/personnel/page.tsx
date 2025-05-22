import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, UserPlus, CalendarDays, Eye } from "lucide-react";

// Mock data
const personnel = [
  { id: "user001", name: "Alice Wonderland", role: "Lead Camera Operator", status: "Available", avatar: "https://placehold.co/40x40.png?text=AW" },
  { id: "user002", name: "Bob The Builder", role: "Audio Engineer", status: "Assigned", avatar: "https://placehold.co/40x40.png?text=BB" },
  { id: "user003", name: "Charlie Chaplin", role: "Producer", status: "Available", avatar: "https://placehold.co/40x40.png?text=CC" },
  { id: "user004", name: "Diana Prince", role: "Drone Pilot", status: "On Leave", avatar: "https://placehold.co/40x40.png?text=DP" },
];

export default function PersonnelPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel Management</h1>
          <p className="text-muted-foreground">Assign team members to events and visualize schedules.</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-5 w-5" />
          Add Team Member
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Team Roster</CardTitle>
          <CardDescription>List of all team members and their current status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnel.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{member.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    <Badge variant={
                      member.status === "Available" ? "default" : // Default could be a green-ish if not primary
                      member.status === "Assigned" ? "secondary" :
                      "outline" // for On Leave
                    }>{member.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:text-accent">
                      <CalendarDays className="h-4 w-4" />
                      <span className="sr-only">View Schedule</span>
                    </Button>
                     <Button variant="ghost" size="icon" className="hover:text-accent">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Assign to Event</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Personnel Assignment Interface</CardTitle>
            <CardDescription>Assign team members based on availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Drag-and-drop or selection interface for assigning personnel to events. (Coming Soon)</p>
            <img src="https://placehold.co/600x400.png" alt="Assignment Interface Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="assignment board schedule" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Team Schedule Visualization</CardTitle>
            <CardDescription>Visualize team member schedules (e.g., Gantt chart, calendar).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Visual representation of team schedules. (Coming Soon)</p>
            <img src="https://placehold.co/600x400.png" alt="Schedule Visualization Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="gantt chart team" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
