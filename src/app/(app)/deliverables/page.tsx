
"use client";

import { useState, type FormEvent, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea"; // Textarea not used directly in AI form now
import { Label } from "@/components/ui/label";
import { UploadCloud, Edit, Trash2, FileText, Sparkles, Loader2 } from "lucide-react";
import { generateDeliverableSummary, type DeliverableSummaryInput, type DeliverableSummaryOutput } from "@/ai/flows/deliverable-summary-generator";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext } from "@/contexts/ProjectContext";

// Updated Mock data with projectName
const allDeliverables = [
  { id: "del001", name: "Highlight Reel - Day 1", event: "Main Stage - Day 1", dueDate: "2024-07-16", status: "In Progress", type: "Video", projectName: "Summer Music Festival 2024" },
  { id: "del002", name: "Keynote Recording", event: "Keynote Speech", dueDate: "2024-09-15", status: "Pending", type: "Video", projectName: "Tech Conference X" },
  { id: "del003", name: "Photo Album", event: "VIP Reception", dueDate: "2024-11-06", status: "Completed", type: "Images", projectName: "Corporate Gala Dinner" },
  { id: "del004", name: "Full Event Recap", event: "Summer Music Festival 2024", dueDate: "2024-09-15", status: "Blocked", type: "Report/Video", projectName: "Summer Music Festival 2024" },
  { id: "del005", name: "Sizzle Reel - Tech", event: "Tech Conference X", dueDate: "2024-09-20", status: "In Progress", type: "Video", projectName: "Tech Conference X" },
];

export default function DeliverablesPage() {
  const { selectedProject } = useProjectContext();
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<DeliverableSummaryOutput | null>(null);
  const [eventNameForSummary, setEventNameForSummary] = useState("All Projects");
  const { toast } = useToast();

  const deliverables = useMemo(() => {
    if (!selectedProject) {
      return allDeliverables; // Show all if no project selected
    }
    return allDeliverables.filter(d => d.projectName === selectedProject.name);
  }, [selectedProject]);
  
  // Update eventNameForSummary when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      setEventNameForSummary(selectedProject.name);
    } else {
      setEventNameForSummary("All Projects");
    }
    setSummaryResult(null); // Clear previous summary when project changes
  }, [selectedProject]);


  const handleGenerateSummary = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingSummary(true);
    setSummaryResult(null);

    // Use the filtered deliverables for the summary context
    const deliverablesToSummarize = selectedProject 
      ? allDeliverables.filter(d => d.projectName === selectedProject.name) 
      : allDeliverables;

    const deliverablesData = JSON.stringify(deliverablesToSummarize.map(d => ({
        name: d.name,
        status: d.status,
        dueDate: d.dueDate,
        event: d.event, // Include event for better context in summary
    })));

    try {
      const result = await generateDeliverableSummary({
        eventOrProjectName: eventNameForSummary, // This is now aligned with selectedProject or "All Projects"
        deliverablesData: deliverablesData,
      });
      setSummaryResult(result);
      toast({
        title: "Summary Generated",
        description: `Deliverable summary for ${eventNameForSummary} has been successfully generated.`,
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate deliverable summary.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliverables Tracker</h1>
          <p className="text-muted-foreground">
            {selectedProject ? `Deliverables for ${selectedProject.name}` : "Track all deliverables per event with status updates and uploads."}
          </p>
        </div>
        {/* Button to add new deliverable could be here */}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-accent" /> Deliverables List</CardTitle>
          <CardDescription>
            {selectedProject ? `Deliverables associated with ${selectedProject.name}.` : "Centralized list of all project deliverables."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliverables.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deliverable Name</TableHead>
                  <TableHead>Event</TableHead>
                  {!selectedProject && <TableHead>Project</TableHead>}
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverables.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.event}</TableCell>
                    {!selectedProject && <TableCell>{item.projectName}</TableCell>}
                    <TableCell>{item.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === "In Progress" ? "secondary" :
                        item.status === "Pending" ? "outline" :
                        item.status === "Completed" ? "default" : 
                        item.status === "Blocked" ? "destructive" : "outline"
                      }>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="hover:text-accent">
                        <UploadCloud className="h-4 w-4" />
                        <span className="sr-only">Upload</span>
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
              No deliverables found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-6 w-6 text-accent icon-glow" /> AI Deliverable Summary</CardTitle>
          <CardDescription>Generate an AI-powered summary of deliverable statuses {selectedProject ? `for ${selectedProject.name}`: "for all projects"}.</CardDescription>
        </CardHeader>
        <form onSubmit={handleGenerateSummary}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="eventNameSummary">Project for Summary</Label>
              <Input 
                id="eventNameSummary" 
                value={eventNameForSummary}
                readOnly // Value is now controlled by project context
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Summary will be generated for the currently selected project (or all projects if "All Projects" is chosen).</p>
            </div>
            <p className="text-sm text-muted-foreground">Using current deliverable data for the specified scope to generate summary.</p>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoadingSummary || deliverables.length === 0}>
              {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Summary
            </Button>
          </CardFooter>
        </form>
        {summaryResult && (
          <CardContent className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Generated Summary for {eventNameForSummary}:</h3>
            <div className="p-4 bg-muted/50 rounded-md space-y-2">
              <p><span className="font-medium">Overall Progress:</span> {summaryResult.progress}</p>
              <p><span className="font-medium">Detailed Summary:</span></p>
              <pre className="whitespace-pre-wrap text-sm bg-background p-3 rounded">{summaryResult.summary}</pre>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
