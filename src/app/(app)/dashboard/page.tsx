// src/app/(app)/dashboard/page.tsx
"use client"; // Required for chart components

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, 
  BarChart3, 
  CheckCircle, 
  Users, 
  Package, 
  CalendarClock,
  FolderKanban // Consolidated import
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";

// Sample data for Event Coverage Chart
const eventCoverageData = [
  { event: "Music Fest D1", coverage: 75, fill: "var(--color-event-a)" },
  { event: "Tech Conf X", coverage: 90, fill: "var(--color-event-b)" },
  { event: "Gala Dinner", coverage: 60, fill: "var(--color-event-c)" },
  { event: "Workshop ABC", coverage: 85, fill: "var(--color-event-d)" },
  { event: "Product Launch", coverage: 50, fill: "var(--color-event-e)" },
];

const chartConfig = {
  coverage: {
    label: "Coverage (%)",
  },
  "event-a": { // Corresponds to fill variable name part
    label: "Music Fest D1",
    color: "hsl(var(--chart-1))",
  },
  "event-b": {
    label: "Tech Conf X",
    color: "hsl(var(--chart-2))",
  },
  "event-c": {
    label: "Gala Dinner",
    color: "hsl(var(--chart-3))",
  },
  "event-d": {
    label: "Workshop ABC",
    color: "hsl(var(--chart-4))",
  },
  "event-e": {
    label: "Product Launch",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;


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
          <CardContent className="h-[350px] p-4"> {/* Adjusted height for the chart */}
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
                  {eventCoverageData.map((entry) => (
                     <rect key={entry.event} fill={entry.fill} />
                  ))}
                </Bar>
                 {/* 
                  Note: For individual bar colors with recharts, you'd typically map <Cell> components inside <Bar>
                  or ensure data keys match config for automatic coloring if `fill` prop on <Bar> is dynamic or complex.
                  Simpler approach shown uses `fill` in data, but ChartConfig provides legend colors.
                  For direct mapping of bar colors to legend, often the Bar `dataKey` matches a key in chartConfig.
                  Here, we use a generic `coverage` dataKey and rely on the `fill` in the data for bar colors.
                  The legend will be generic if not configured to match these dynamic fills.
                  A more robust way is to have multiple <Bar> components or complex data structure if colors per bar are critical and tied to legend dynamically.
                  For simplicity, legend is omitted here, but you can add <ChartLegend content={<ChartLegendContent />} />
                */}
              </BarChart>
            </ChartContainer>
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
