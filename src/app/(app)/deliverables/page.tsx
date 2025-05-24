
"use client";

import { useState, type FormEvent, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Edit, Trash2, FileText, Sparkles, Loader2, PlusCircle, CalendarIcon } from "lucide-react";
import { generateDeliverableSummary, type DeliverableSummaryOutput } from "@/ai/flows/deliverable-summary-generator";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type Project } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext"; // Import
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const deliverableSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  event: z.string().min(3, "Event name must be at least 3 characters."),
  projectId: z.string().min(1, "Please select a project."),
  dueDate: z.date({ required_error: "Due date is required." }),
  status: z.enum(["Pending", "In Progress", "Completed", "Blocked"]),
  type: z.string().min(2, "Type must be at least 2 characters."),
});

type DeliverableFormData = z.infer<typeof deliverableSchema>;

export type Deliverable = DeliverableFormData & {
  id: string;
  projectName: string; 
};

const initialDeliverablesMock: Deliverable[] = [
  { id: "del001", name: "Highlight Reel - Day 1", event: "Main Stage - Day 1", dueDate: parseISO("2024-07-16"), status: "In Progress", type: "Video", projectName: "Summer Music Festival 2024", projectId: "proj001" },
  { id: "del002", name: "Keynote Recording", event: "Keynote Speech", dueDate: parseISO("2024-09-15"), status: "Pending", type: "Video", projectName: "Tech Conference X", projectId: "proj002" },
  { id: "del003", name: "Photo Album", event: "VIP Reception", dueDate: parseISO("2024-11-06"), status: "Completed", type: "Images", projectName: "Corporate Gala Dinner", projectId: "proj003" },
  { id: "del004", name: "Full Event Recap", event: "Summer Music Festival 2024", dueDate: parseISO("2024-09-15"), status: "Blocked", type: "Report/Video", projectName: "Summer Music Festival 2024", projectId: "proj001" },
  { id: "del005", name: "Sizzle Reel - Tech", event: "Tech Conference X", dueDate: parseISO("2024-09-20"), status: "In Progress", type: "Video", projectName: "Tech Conference X", projectId: "proj002" },
];

export default function DeliverablesPage() {
  const { selectedProject, projects: allProjectsFromContext, isLoadingProjects } = useProjectContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [deliverablesList, setDeliverablesList] = useState<Deliverable[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<DeliverableSummaryOutput | null>(null);
  const [eventNameForSummary, setEventNameForSummary] = useState("All Projects");
  const [isAddDeliverableDialogOpen, setIsAddDeliverableDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoadingSettings) {
      setDeliverablesList(useDemoData ? initialDeliverablesMock : []);
    }
  }, [useDemoData, isLoadingSettings]);

  const {
    register: registerDeliverable,
    handleSubmit: handleSubmitDeliverable,
    reset: resetDeliverableForm,
    control: controlDeliverable,
    formState: { errors: deliverableErrors },
  } = useForm<DeliverableFormData>({
    resolver: zodResolver(deliverableSchema),
    defaultValues: {
      name: "",
      event: "",
      projectId: "",
      dueDate: new Date(),
      status: "Pending",
      type: "",
    },
  });

  const filteredDeliverables = useMemo(() => {
    if (!selectedProject) {
      return deliverablesList;
    }
    return deliverablesList.filter(d => d.projectName === selectedProject.name);
  }, [selectedProject, deliverablesList]);
  
  useEffect(() => {
    if (selectedProject) {
      setEventNameForSummary(selectedProject.name);
    } else {
      setEventNameForSummary("All Projects");
    }
    setSummaryResult(null); 
  }, [selectedProject]);

  const handleAddDeliverableSubmit: SubmitHandler<DeliverableFormData> = (data) => {
    const selectedProjInfo = allProjectsFromContext.find(p => p.id === data.projectId);
    const newDeliverable: Deliverable = {
      ...data,
      id: `del${String(deliverablesList.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      projectName: selectedProjInfo?.name || "Unknown Project",
    };
    setDeliverablesList((prevList) => [...prevList, newDeliverable]);
    toast({
      title: "Deliverable Added",
      description: `"${data.name}" has been successfully added.`,
    });
    resetDeliverableForm();
    setIsAddDeliverableDialogOpen(false);
  };

  const handleGenerateSummary = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingSummary(true);
    setSummaryResult(null);

    const deliverablesData = JSON.stringify(filteredDeliverables.map(d => ({
        name: d.name,
        status: d.status,
        dueDate: format(d.dueDate, "yyyy-MM-dd"),
        event: d.event,
        project: d.projectName,
    })));

    try {
      const result = await generateDeliverableSummary({
        eventOrProjectName: eventNameForSummary,
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

  if (isLoadingSettings || isLoadingProjects) {
    return <div>Loading deliverables data settings...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliverables Tracker</h1>
          <p className="text-muted-foreground">
            {selectedProject ? `Deliverables for ${selectedProject.name}` : "Track all deliverables per event with status updates and uploads."}
          </p>
        </div>
        <Dialog open={isAddDeliverableDialogOpen} onOpenChange={setIsAddDeliverableDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Deliverable
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Deliverable</DialogTitle>
              <DialogDescription>
                Fill in the details for the new deliverable.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitDeliverable(handleAddDeliverableSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deliverable-name" className="text-right">Name</Label>
                <div className="col-span-3">
                  <Input id="deliverable-name" {...registerDeliverable("name")} className={deliverableErrors.name ? "border-destructive" : ""} />
                  {deliverableErrors.name && <p className="text-xs text-destructive mt-1">{deliverableErrors.name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deliverable-event" className="text-right">Event</Label>
                <div className="col-span-3">
                  <Input id="deliverable-event" {...registerDeliverable("event")} className={deliverableErrors.event ? "border-destructive" : ""} />
                  {deliverableErrors.event && <p className="text-xs text-destructive mt-1">{deliverableErrors.event.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deliverable-project" className="text-right">Project</Label>
                <div className="col-span-3">
                  <Controller
                    name="projectId"
                    control={controlDeliverable}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className={deliverableErrors.projectId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProjectsFromContext.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {deliverableErrors.projectId && <p className="text-xs text-destructive mt-1">{deliverableErrors.projectId.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deliverable-dueDate" className="text-right">Due Date</Label>
                <div className="col-span-3">
                  <Controller
                    name="dueDate"
                    control={controlDeliverable}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                              deliverableErrors.dueDate ? "border-destructive" : ""
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {deliverableErrors.dueDate && <p className="text-xs text-destructive mt-1">{deliverableErrors.dueDate.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deliverable-status" className="text-right">Status</Label>
                <div className="col-span-3">
                  <Controller
                    name="status"
                    control={controlDeliverable}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className={deliverableErrors.status ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Pending", "In Progress", "Completed", "Blocked"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                   {deliverableErrors.status && <p className="text-xs text-destructive mt-1">{deliverableErrors.status.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deliverable-type" className="text-right">Type</Label>
                <div className="col-span-3">
                  <Input id="deliverable-type" {...registerDeliverable("type")} placeholder="e.g., Video, Images, Report" className={deliverableErrors.type ? "border-destructive" : ""} />
                  {deliverableErrors.type && <p className="text-xs text-destructive mt-1">{deliverableErrors.type.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Deliverable</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-accent" /> Deliverables List</CardTitle>
          <CardDescription>
            {selectedProject ? `Deliverables associated with ${selectedProject.name}.` : "Centralized list of all project deliverables."}
            ({filteredDeliverables.length} items)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDeliverables.length > 0 ? (
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
                {filteredDeliverables.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.event}</TableCell>
                    {!selectedProject && <TableCell>{item.projectName}</TableCell>}
                    <TableCell>{format(item.dueDate, "yyyy-MM-dd")}</TableCell>
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
                      <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <UploadCloud className="h-4 w-4" />
                        <span className="sr-only">Upload</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-accent" disabled>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" disabled>
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
              No deliverables found {selectedProject ? `for ${selectedProject.name}` : "matching your criteria"}. {useDemoData ? 'Toggle "Load Demo Data" in settings or add one.' : 'Add a deliverable to get started.'}
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
                readOnly 
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Summary will be generated for the currently selected project (or all projects if "All Projects" is chosen).</p>
            </div>
            <p className="text-sm text-muted-foreground">Using current deliverable data for the specified scope to generate summary.</p>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoadingSummary || filteredDeliverables.length === 0}>
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
