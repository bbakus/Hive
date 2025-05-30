
"use client"; 

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  Package, 
  CalendarClock,
  FolderKanban,
  ArrowRight
} from "lucide-react"; // Removed Activity, CheckCircle
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const allProjectsMockData = [
  { id: "proj001", name: "Summer Music Festival 2024", status: "In Progress" },
  { id: "proj002", name: "Tech Conference X", status: "Planning" },
  { id: "proj003", name: "Corporate Gala Dinner", status: "Completed" },
];

const allEventsMockData = [
  { id: "evt001", name: "Main Stage - Day 1", project: "Summer Music Festival 2024", date: "2024-07-15", coverage: 75 },
  { id: "evt002", name: "Keynote Speech", project: "Tech Conference X", date: "2024-09-15", coverage: 90 },
  { id: "evt003", name: "VIP Reception", project: "Corporate Gala Dinner", date: "2024-11-05", coverage: 60 },
  { id: "evt004", name: "Workshop ABC", project: "Summer Music Festival 2024", date: "2024-07-16", coverage: 85 },
  { id: "evt005", name: "Product Launch Q3", project: "Tech Conference X", date: "2024-09-16", coverage: 50 },
];

const allDeliverablesMockData = [
  { id: "del001", name: "Highlight Reel - Day 1", projectName: "Summer Music Festival 2024", status: "In Progress", event: "Main Stage - Day 1" },
  { id: "del002", name: "Keynote Recording", projectName: "Tech Conference X", status: "Pending", event: "Keynote Speech" },
  { id: "del003", name: "Photo Album", projectName: "Corporate Gala Dinner", status: "Completed", event: "VIP Reception" },
  { id: "del004", name: "Full Event Recap", projectName: "Summer Music Festival 2024", status: "Blocked", event: "Summer Music Festival 2024" },
  { id: "del005", name: "Presentation Slides", projectName: "Tech Conference X", status: "Completed", event: "Tech Conference X" },
  { id: "del006", name: "Social Media Clips", projectName: "Summer Music Festival 2024", status: "In Progress", event: "Main Stage - Day 1" },
  { id: "del007", name: "Attendee Feedback Report", projectName: "Tech Conference X", status: "Pending", event: "Tech Conference X" },
];

const baseEventCoverageDataMock = [
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
} satisfies ChartConfig;


export default function DashboardPage() {
  const { selectedProjectId, selectedProject, isLoadingProjects } = useProjectContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();

  const [allProjects, setAllProjects] = useState(allProjectsMockData);
  const [allEvents, setAllEvents] = useState(allEventsMockData);
  const [allDeliverables, setAllDeliverables] = useState(allDeliverablesMockData);
  const [baseEventCoverageData, setBaseEventCoverageData] = useState(baseEventCoverageDataMock);

  useEffect(() => {
    if (!isLoadingSettings) {
      setAllProjects(useDemoData ? allProjectsMockData : []);
      setAllEvents(useDemoData ? allEventsMockData : []);
      setAllDeliverables(useDemoData ? allDeliverablesMockData : []);
      setBaseEventCoverageData(useDemoData ? baseEventCoverageDataMock : []);
    }
  }, [useDemoData, isLoadingSettings]);


  const filteredProjects = useMemo(() => {
    if (!selectedProjectId) return allProjects;
    return allProjects.filter(p => p.id === selectedProjectId);
  }, [selectedProjectId, allProjects]);

  const filteredEvents = useMemo(() => {
    if (!selectedProject) return allEvents;
    return allEvents.filter(e => e.project === selectedProject.name);
  }, [selectedProject, allEvents]);

  const filteredDeliverables = useMemo(() => {
    if (!selectedProject) return allDeliverables;
    return allDeliverables.filter(d => d.projectName === selectedProject.name);
  }, [selectedProject, allDeliverables]);
  
  const eventCoverageData = useMemo(() => {
    if (!selectedProject) return baseEventCoverageData; 
    return baseEventCoverageData.filter(ec => ec.projectName === selectedProject.name);
  }, [selectedProject, baseEventCoverageData]);

  const overviewItems = useMemo(() => {
    let activeProjectsCount = 0;
    if (selectedProjectId) {
        const proj = allProjects.find(p => p.id === selectedProjectId);
        if (proj && (proj.status === "In Progress" || proj.status === "Planning")) {
            activeProjectsCount = 1;
        }
    } else {
        activeProjectsCount = allProjects.filter(p => p.status === "In Progress" || p.status === "Planning").length;
    }

    const upcomingEventsCount = filteredEvents.length; 
    const deliverablesDueCount = filteredDeliverables.filter(d => d.status !== "Completed").length;

    return [
      { title: selectedProjectId ? "Selected Project Status" : "Active Projects", value: selectedProjectId ? (selectedProject?.status || "N/A") : activeProjectsCount.toString(), icon: FolderKanban, description: selectedProjectId ? `Status of ${selectedProject?.name}` : "Currently ongoing or planning" },
      { title: "Upcoming Events", value: upcomingEventsCount.toString(), icon: CalendarClock, description: selectedProject ? `For ${selectedProject.name}` : "Across all projects" },
      { title: "Deliverables Due", value: deliverablesDueCount.toString(), icon: Package, description: selectedProject ? `For ${selectedProject.name}` : "Across all projects" },
      { title: "Team Load", value: useDemoData ? "75%" : "N/A", icon: Users, description: useDemoData ? "Average personnel capacity" : "No personnel data" },
    ];
  }, [selectedProjectId, selectedProject, filteredEvents, filteredDeliverables, allProjects, useDemoData]);

  if (isLoadingSettings || isLoadingProjects) {
    return <div>Loading dashboard data settings...</div>;
  }

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
          <Card key={item.title}>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Event Coverage</CardTitle> {/* Use primary for icon color */}
            <CardDescription>
              {selectedProject ? `Event coverage for ${selectedProject.name}` : "Overview of event coverage status."}
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
                  <Bar dataKey="coverage" radius={0}> {/* radius 0 for sharp bars */}
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
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Deliverables Status</CardTitle> {/* Use primary for icon color */}
            <CardDescription>
              {selectedProject ? `Deliverable progress for ${selectedProject.name}` : "Summary of current deliverable progress."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-4">
            {filteredDeliverables.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {filteredDeliverables.map((deliverable) => (
                    <div key={deliverable.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-none hover:bg-secondary/80 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{deliverable.name}</p>
                        <p className="text-xs text-muted-foreground">Event: {deliverable.event}</p>
                      </div>
                      <Badge variant={
                        deliverable.status === "In Progress" ? "secondary" :
                        deliverable.status === "Pending" ? "outline" :
                        deliverable.status === "Completed" ? "default" : 
                        deliverable.status === "Blocked" ? "destructive" : "outline"
                      }>{deliverable.status}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No deliverables {selectedProject ? `for ${selectedProject.name}` : "tracked"}.
              </div>
            )}
          </CardContent>
           {filteredDeliverables.length > 0 && (
            <CardContent className="pt-2 pb-4 border-t">
               <Button variant="link" asChild className="p-0 h-auto text-sm text-primary hover:text-primary/90">
                <Link href="/deliverables">
                  View All Deliverables <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
