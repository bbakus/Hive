
// src/app/(app)/dashboard/page.tsx
"use client"; // Required for chart components and context

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, 
  BarChart3, 
  CheckCircle, 
  Users, 
  Package, 
  CalendarClock,
  FolderKanban
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  // ChartLegend, // Legend can be added back if needed
  // ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";
import { useProjectContext } from "@/contexts/ProjectContext";

// Mock data sources - In a real app, these would be fetched or managed more globally
const allProjectsMock = [
  { id: "proj001", name: "Summer Music Festival 2024", status: "In Progress" },
  { id: "proj002", name: "Tech Conference X", status: "Planning" },
  { id: "proj003", name: "Corporate Gala Dinner", status: "Completed" },
];

const allEventsMock = [
  { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", date: "2024-07-15", coverage: 75 },
  { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", date: "2024-09-15", coverage: 90 },
  { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", date: "2024-11-05", coverage: 60 },
  { id: "evt004", name: "Workshop ABC", project: "Summer Music Festival 2024", date: "2024-07-16", coverage: 85 },
  { id: "evt005", name: "Product Launch Q3", project: "Tech Conference X", date: "2024-09-16", coverage: 50 },
];

const allDeliverablesMock = [
  { id: "del001", name: "Highlight Reel - Day 1", projectName: "Summer Music Festival 2024", status: "In Progress" },
  { id: "del002", name: "Keynote Recording", projectName: "Tech Conference X", status: "Pending" },
  { id: "del003", name: "Photo Album", projectName: "Corporate Gala Dinner", status: "Completed" },
  { id: "del004", name: "Full Event Recap", projectName: "Summer Music Festival 2024", status: "Blocked" },
  { id: "del005", name: "Presentation Slides", projectName: "Tech Conference X", status: "Completed" },
];

// Sample data for Event Coverage Chart - including projectName for filtering
const baseEventCoverageData = [
  { event: "Music Fest D1", coverage: 75, fill: "hsl(var(--chart-1))", projectName: "Summer Music Festival 2024" },
  { event: "Tech Conf X", coverage: 90, fill: "hsl(var(--chart-2))", projectName: "Tech Conference X" },
  { event: "Gala Dinner", coverage: 60, fill: "hsl(var(--chart-3))", projectName: "Corporate Gala Dinner" },
  { event: "Workshop ABC", coverage: 85, fill: "hsl(var(--chart-4))", projectName: "Summer Music Festival 2024" },
  { event: "Product Launch", coverage: 50, fill: "hsl(var(--chart-5))", projectName: "Tech Conference X" },
];

const chartConfig = {
  coverage: {
    label: "Coverage (%)",
  },
  // Individual event configs can be added if more specific legend/tooltips are needed per event
  // For dynamic fills, the Cell component inside Bar is used.
} satisfies ChartConfig;


export default function DashboardPage() {
  const { selectedProjectId, selectedProject } = useProjectContext();

  const filteredProjects = useMemo(() => {
    if (!selectedProjectId) return allProjectsMock;
    return allProjectsMock.filter(p => p.id === selectedProjectId);
  }, [selectedProjectId]);

  const filteredEvents = useMemo(() => {
    if (!selectedProject) return allEventsMock;
    return allEventsMock.filter(e => e.project === selectedProject.name);
  }, [selectedProject]);

  const filteredDeliverables = useMemo(() => {
    if (!selectedProject) return allDeliverablesMock;
    return allDeliverablesMock.filter(d => d.projectName === selectedProject.name);
  }, [selectedProject]);
  
  const eventCoverageData = useMemo(() => {
    if (!selectedProject) return baseEventCoverageData;
    return baseEventCoverageData.filter(ec => ec.projectName === selectedProject.name);
  }, [selectedProject]);

  const overviewItems = useMemo(() => {
    let activeProjectsCount = 0;
    if (selectedProjectId) {
        const proj = allProjectsMock.find(p => p.id === selectedProjectId);
        if (proj && (proj.status === "In Progress" || proj.status === "Planning")) {
            activeProjectsCount = 1;
        }
    } else {
        activeProjectsCount = allProjectsMock.filter(p => p.status === "In Progress" || p.status === "Planning").length;
    }

    const upcomingEventsCount = filteredEvents.length; // Simplified: count all events for the project / all events
    const deliverablesDueCount = filteredDeliverables.filter(d => d.status !== "Completed").length;

    return [
      { title: selectedProjectId ? "Selected Project Status" : "Active Projects", value: selectedProjectId ? (selectedProject?.status || "N/A") : activeProjectsCount.toString(), icon: FolderKanban, description: selectedProjectId ? `Status of ${selectedProject?.name}` : "Currently ongoing or planning" },
      { title: "Upcoming Events", value: upcomingEventsCount.toString(), icon: CalendarClock, description: selectedProject ? `For ${selectedProject.name}` : "Events this month" },
      { title: "Deliverables Due", value: deliverablesDueCount.toString(), icon: Package, description: selectedProject ? `For ${selectedProject.name}` : "Pending deliverables" },
      { title: "Team Load", value: "75%", icon: Users, description: "Average personnel capacity" }, // Remains global for now
    ];
  }, [selectedProjectId, selectedProject, filteredEvents, filteredDeliverables]);


  return (
    <div className="flex flex-col gap-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {selectedProject ? `Overview for ${selectedProject.name}` : "Welcome to HIVE. Here's an overview of your operations."}
        </p>
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
            <CardDescription>
              {selectedProject ? `Event statuses for ${selectedProject.name}` : "Overview of upcoming event statuses."}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-4">
            {eventCoverageData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart accessibilityLayer data={eventCoverageData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="event"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="coverage" radius={4}>
                    {eventCoverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No event coverage data {selectedProject ? `for ${selectedProject.name}` : "available"}.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-6 w-6 text-accent" /> Deliverables Status</CardTitle>
            <CardDescription>
              {selectedProject ? `Deliverable progress for ${selectedProject.name}` : "Summary of current deliverable progress."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for chart or list */}
            <div className="h-60 flex items-center justify-center bg-muted/50 rounded-md">
              <p className="text-muted-foreground">
                {filteredDeliverables.length > 0 ? `${filteredDeliverables.length} deliverables tracked.` : "No deliverables."}
                {/* TODO: Implement a chart or detailed list here */}
              </p>
            </div>
            <img src="https://placehold.co/600x300.png" alt="Deliverables Status Chart Placeholder" className="w-full h-auto mt-4 rounded-md" data-ai-hint="deliverables status chart"/>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
