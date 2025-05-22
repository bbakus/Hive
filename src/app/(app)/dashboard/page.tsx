import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, CheckCircle, Users, Package, CalendarClock } from "lucide-react";

export default function DashboardPage() {
  const overviewItems = [
    { title: "Active Projects", value: "12", icon: FolderKanban, description: "Currently ongoing projects" },
    { title: "Upcoming Events", value: "5", icon: CalendarClock, description: "Events scheduled this month" },
    { title: "Deliverables Due", value: "8", icon: Package, description: "Pending deliverables" },
    { title: "Team Load", value: "75%", icon: Users, description: "Average personnel capacity" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to HIVE. Here's an overview of your operations.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewItems.map((item) => (
          <Card key={item.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-accent" /> Event Coverage</CardTitle>
            <CardDescription>Overview of upcoming event statuses and coverage.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for chart or list */}
            <div className="h-60 flex items-center justify-center bg-muted/50 rounded-md">
              <p className="text-muted-foreground">Event Coverage Chart/Data</p>
            </div>
             <img src="https://placehold.co/600x300.png" alt="Event Coverage Chart Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="event coverage chart"/>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-6 w-6 text-accent" /> Deliverables Status</CardTitle>
            <CardDescription>Summary of current deliverable progress.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for chart or list */}
            <div className="h-60 flex items-center justify-center bg-muted/50 rounded-md">
              <p className="text-muted-foreground">Deliverables Status Chart/Data</p>
            </div>
            <img src="https://placehold.co/600x300.png" alt="Deliverables Status Chart Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="deliverables status chart"/>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { FolderKanban } from "lucide-react";
