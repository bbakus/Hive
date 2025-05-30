
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

export default function ShotPlannerPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-accent" /> Shot Planner
        </h1>
        <p className="text-muted-foreground">Plan and organize all shots for your projects and events.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Shot Planning & Organization Tools</CardTitle>
          <CardDescription>This section is under development. Future features may include:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Global view of all shot requests across projects/events.</li>
            <li>Advanced filtering and sorting of shot requests (by priority, status, assigned personnel, event, etc.).</li>
            <li>Bulk editing capabilities for shot requests.</li>
            <li>Tools for storyboarding or sequencing shots.</li>
            <li>Integration with call sheets or production schedules.</li>
            <li>Visual dashboards for shot completion status across an entire project.</li>
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
