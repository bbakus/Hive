import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2 } from "lucide-react";

// Mock data
const projects = [
  { id: "proj001", name: "Summer Music Festival 2024", startDate: "2024-06-01", endDate: "2024-08-31", status: "In Progress", description: "Annual summer music festival featuring diverse artists." },
  { id: "proj002", name: "Tech Conference X", startDate: "2024-09-15", endDate: "2024-09-17", status: "Planning", description: "Major technology conference showcasing new innovations." },
  { id: "proj003", name: "Corporate Gala Dinner", startDate: "2024-11-05", endDate: "2024-11-05", status: "Completed", description: "Annual corporate fundraising gala." },
];

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your event timelines and project setups.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Project
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Project List</CardTitle>
          <CardDescription>Overview of all registered projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.startDate}</TableCell>
                  <TableCell>{project.endDate}</TableCell>
                  <TableCell>
                    <Badge variant={
                      project.status === "In Progress" ? "secondary" :
                      project.status === "Planning" ? "outline" :
                      project.status === "Completed" ? "default" : "destructive"
                    }>{project.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
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
        </CardContent>
      </Card>

      {/* Placeholder for Project Setup Wizard */}
      {/* This could be a Dialog or a separate section */}
      {/* For now, a simple card indicating its presence */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Project Setup Wizard</CardTitle>
          <CardDescription>Guide to create and configure new projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The project setup wizard will allow for easy creation and management of event timelines. (Coming Soon)</p>
          <img src="https://placehold.co/600x400.png" alt="Project Setup Wizard Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="wizard interface diagram" />
        </CardContent>
      </Card>
    </div>
  );
}
