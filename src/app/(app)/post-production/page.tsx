
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film } from "lucide-react";

export default function PostProductionPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Film className="h-8 w-8 text-accent" /> Post-Production
        </h1>
        <p className="text-muted-foreground">Manage editing tasks, versions, and reviews.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Post-Production Workflow</CardTitle>
          <CardDescription>Features for the editing and review phase of your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This section is under development. Future features may include:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Editing task assignment and tracking</li>
            <li>Version control for video edits</li>
            <li>Client review and feedback portals</li>
            <li>Color grading and audio mixing coordination</li>
          </ul>
          <img 
            src="https://placehold.co/600x400.png" 
            alt="Post-Production Placeholder" 
            className="w-full h-auto mt-4 rounded-md" 
            data-ai-hint="video editing suite" 
          />
        </CardContent>
      </Card>
    </div>
  );
}
