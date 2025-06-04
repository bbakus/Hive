
"use client";

import { useState, type FormEvent, useMemo, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Edit, Trash2, Sparkles, Loader2, PlusCircle, Share, Eye, PackageSearch, PackageCheck } from "lucide-react"; // Added PackageCheck
import { generateDeliverableSummary, type DeliverableSummaryOutput } from "@/ai/flows/deliverable-summary-generator";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext, type Project } from "@/contexts/ProjectContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SubmitHandler } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { DeliverableFormDialog, type DeliverableFormDialogData } from "@/components/modals/DeliverableFormDialog";
import { ClientGalleryFormDialog, type ClientGalleryFormDialogData, type ClientGallery } from "@/components/modals/ClientGalleryFormDialog";


export type Deliverable = DeliverableFormDialogData & {
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

const initialClientGalleriesMock: ClientGallery[] = [
    { id: "gal001", galleryName: "Summer Fest Highlights", clientEmail: "clientA@example.com", accessType: "password", password: "password123", allowHighResDownload: true, enableWatermarking: false, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Enjoy the highlights!", deliverableContextName: "Summer Music Festival 2024" },
    { id: "gal002", galleryName: "Tech Conference Keynotes", clientEmail: "clientB@example.com", accessType: "private", allowHighResDownload: false, enableWatermarking: true, expiresOn: null, welcomeMessage: "Keynote recordings for Tech Conference X.", deliverableContextName: "Tech Conference X" },
    {
      id: "gal003",
      galleryName: "G9e Summit Live Previews",
      clientEmail: "internal_stakeholder@g9e.com",
      accessType: "private",
      password: "",
      allowHighResDownload: true,
      enableWatermarking: true,
      expiresOn: parseISO("2024-12-31"),
      welcomeMessage: "Live previews from the G9e Annual Summit 2024.",
      deliverableContextName: "G9e Annual Summit 2024"
    },
];


export default function DeliverablesPage() {
  const { selectedProject, projects: allProjectsFromContext, isLoadingProjects } = useProjectContext();
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const [deliverablesList, setDeliverablesList] = useState<Deliverable[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<DeliverableSummaryOutput | null>(null);
  const [eventNameForSummary, setEventNameForSummary] = useState("All Projects");
  
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deliverableToDeleteId, setDeliverableToDeleteId] = useState<string | null>(null);

  const [clientGalleries, setClientGalleries] = useState<ClientGallery[]>([]);
  const [isClientGalleryModalOpen, setIsClientGalleryModalOpen] = useState(false);
  const [editingClientGallery, setEditingClientGallery] = useState<ClientGallery | null>(null);
  const [isDeleteGalleryDialogOpen, setIsDeleteGalleryDialogOpen] = useState(false);
  const [galleryToDeleteId, setGalleryToDeleteId] = useState<string | null>(null);


  const { toast } = useToast();

  useEffect(() => {
    if (!isLoadingSettings) {
      setDeliverablesList(useDemoData ? initialDeliverablesMock : []);
      setClientGalleries(useDemoData ? initialClientGalleriesMock : []);
    }
  }, [useDemoData, isLoadingSettings]);
  
  useEffect(() => {
    if (selectedProject) {
      setEventNameForSummary(selectedProject.name);
    } else {
      setEventNameForSummary("All Projects");
    }
    setSummaryResult(null); 
  }, [selectedProject]);


  const filteredDeliverables = useMemo(() => {
    if (!selectedProject) {
      return deliverablesList;
    }
    return deliverablesList.filter(d => d.projectName === selectedProject.name);
  }, [selectedProject, deliverablesList]);

  const filteredClientGalleries = useMemo(() => {
    if (!selectedProject) {
      return clientGalleries;
    }
    return clientGalleries.filter(g => g.deliverableContextName === selectedProject.name);
  }, [selectedProject, clientGalleries]);
  

  const handleDeliverableSubmit: SubmitHandler<DeliverableFormDialogData> = (data) => {
    const selectedProjInfo = allProjectsFromContext.find(p => p.id === data.projectId);
    
    if (editingDeliverable) {
      setDeliverablesList(prevList => 
        prevList.map(d => 
          d.id === editingDeliverable.id ? { ...editingDeliverable, ...data, projectName: selectedProjInfo?.name || "Unknown Project" } : d
        )
      );
      toast({
        title: "Deliverable Updated",
        description: `"${data.name}" has been successfully updated.`,
      });
    } else {
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
    }
    setIsDeliverableModalOpen(false);
    setEditingDeliverable(null);
  };
  
  const openAddDeliverableModal = () => {
    setEditingDeliverable(null);
    setIsDeliverableModalOpen(true);
  };

  const openEditDeliverableModal = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable);
    setIsDeliverableModalOpen(true);
  };

  const handleDeleteDeliverableClick = (id: string) => {
    setDeliverableToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDeliverable = () => {
    if (deliverableToDeleteId) {
      const deliverable = deliverablesList.find(d => d.id === deliverableToDeleteId);
      setDeliverablesList(prevList => prevList.filter(d => d.id !== deliverableToDeleteId));
      toast({
        title: "Deliverable Deleted",
        description: `Deliverable "${deliverable?.name}" has been deleted.`,
        variant: "destructive"
      });
      setDeliverableToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
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
  
  const handleCreateClientGallerySubmit = (data: ClientGalleryFormDialogData) => {
    if (editingClientGallery) {
      setClientGalleries(prev => prev.map(g => g.id === editingClientGallery.id ? { ...editingClientGallery, ...data } : g));
      toast({
        title: "Client Gallery Updated",
        description: `Gallery "${data.galleryName}" has been updated.`,
      });
    } else {
      const newGallery: ClientGallery = {
        ...data,
        id: `gal${String(clientGalleries.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        deliverableContextName: selectedProject?.name || "Selected Deliverables",
      };
      setClientGalleries(prev => [...prev, newGallery]);
      toast({
        title: "Client Gallery Created (Simulated)",
        description: `Gallery "${data.galleryName}" for ${data.clientEmail} is ready.`,
      });
    }
    setIsClientGalleryModalOpen(false);
    setEditingClientGallery(null);
  };

  const openAddClientGalleryModal = () => {
    setEditingClientGallery(null);
    setIsClientGalleryModalOpen(true);
  };

  const openEditClientGalleryModal = (gallery: ClientGallery) => {
    setEditingClientGallery(gallery);
    setIsClientGalleryModalOpen(true);
  };

  const handleDeleteGalleryClick = (galleryId: string) => {
    setGalleryToDeleteId(galleryId);
    setIsDeleteGalleryDialogOpen(true);
  };

  const confirmDeleteGallery = () => {
    if (galleryToDeleteId) {
      const gallery = clientGalleries.find(g => g.id === galleryToDeleteId);
      setClientGalleries(prevList => prevList.filter(g => g.id !== galleryToDeleteId));
      toast({
        title: "Client Gallery Deleted",
        description: `Gallery "${gallery?.galleryName}" has been deleted.`,
        variant: "destructive"
      });
      setGalleryToDeleteId(null);
    }
    setIsDeleteGalleryDialogOpen(false);
  };


  if (isLoadingSettings || isLoadingProjects) {
    return <div>Loading deliverables data settings...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="h-8 w-8 text-accent" /> Deliverables Tracker
          </p>
          <p className="text-muted-foreground">
            {selectedProject ? `Deliverables for ${selectedProject.name}` : "Track all deliverables per event with status updates and uploads."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddClientGalleryModal} variant="outline">
            <Share className="mr-2 h-4 w-4" />
            Create Client Gallery
          </Button>
          <Button onClick={openAddDeliverableModal} variant="accent">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Deliverable
          </Button>
        </div>
      </div>

      <DeliverableFormDialog
        isOpen={isDeliverableModalOpen}
        onOpenChange={setIsDeliverableModalOpen}
        editingDeliverable={editingDeliverable}
        onSubmit={handleDeliverableSubmit}
        allProjects={allProjectsFromContext}
        selectedProject={selectedProject}
      />

      <ClientGalleryFormDialog
        isOpen={isClientGalleryModalOpen}
        onOpenChange={setIsClientGalleryModalOpen}
        onSubmit={handleCreateClientGallerySubmit}
        contextName={selectedProject?.name || "Selected Deliverables"}
        editingGallery={editingClientGallery}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deliverable?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deliverable? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeliverableToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDeliverable} className={buttonVariants({ variant: "destructive" })}>Delete Deliverable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteGalleryDialogOpen} onOpenChange={setIsDeleteGalleryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client gallery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGalleryToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGallery} className={buttonVariants({ variant: "destructive" })}>Delete Gallery</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold flex items-center gap-2"><PackageCheck className="h-6 w-6 text-accent" /> Deliverables List</p> 
          <div className="text-sm text-muted-foreground"> 
            {selectedProject ? `Deliverables associated with ${selectedProject.name}.` : "Centralized list of all project deliverables."}
            ({filteredDeliverables.length} items)
          </div>
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
                      <Button variant="ghost" size="icon" className="hover:text-foreground/80" disabled>
                        <UploadCloud className="h-4 w-4" />
                        <span className="sr-only">Upload</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-foreground/80" onClick={() => openEditDeliverableModal(item)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteDeliverableClick(item.id)}>
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

      <Card className="border-0">
        <CardHeader>
            <p className="text-lg font-semibold flex items-center gap-2"><PackageSearch className="h-6 w-6 text-accent" /> Client Galleries</p>
            <div className="text-sm text-muted-foreground">
                {selectedProject ? `Client galleries associated with ${selectedProject.name}.` : "All client galleries."}
                 ({filteredClientGalleries.length} galleries)
            </div>
        </CardHeader>
        <CardContent>
            {filteredClientGalleries.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Gallery Name</TableHead>
                            <TableHead>Client Email</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead>Expires On</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClientGalleries.map((gallery) => (
                            <TableRow key={gallery.id}>
                                <TableCell className="font-medium">{gallery.galleryName}</TableCell>
                                <TableCell>{gallery.clientEmail}</TableCell>
                                <TableCell>
                                    <Badge variant={gallery.accessType === 'password' ? 'secondary' : 'outline'}>
                                        {gallery.accessType.charAt(0).toUpperCase() + gallery.accessType.slice(1)}
                                        {gallery.accessType === 'password' && ' Protected'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {gallery.expiresOn ? format(gallery.expiresOn, "PPP") : <span className="text-muted-foreground italic">No Expiry</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="hover:text-foreground/80" asChild>
                                      <Link href={`/gallery/${gallery.id}`} target="_blank">
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">View Gallery</span>
                                      </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hover:text-foreground/80" onClick={() => openEditClientGalleryModal(gallery)}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit Gallery</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteGalleryClick(gallery.id)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Gallery</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground text-center py-8">
                    No client galleries created yet {selectedProject ? `for ${selectedProject.name}` : ""}. Click "Create Client Gallery" to get started.
                </p>
            )}
        </CardContent>
      </Card>


      <Card className="border-0">
        <CardHeader>
          <p className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-6 w-6 text-accent" /> AI Deliverable Summary</p> 
          <div className="text-sm text-muted-foreground">Generate an AI-powered summary of deliverable statuses {selectedProject ? `for ${selectedProject.name}`: "for all projects"}.</div> 
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
            <Button type="submit" variant="accent" disabled={isLoadingSummary || filteredDeliverables.length === 0}>
              {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Summary
            </Button>
          </CardFooter>
        </form>
        {summaryResult && (
          <CardContent className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Generated Summary for {eventNameForSummary}:</h3>
            <div className="p-4 bg-muted/50 rounded-none space-y-2">
              <p><span className="font-medium">Overall Progress:</span> {summaryResult.progress}</p>
              <p><span className="font-medium">Detailed Summary:</span></p>
              <pre className="whitespace-pre-wrap text-sm bg-background p-3 rounded-none">{summaryResult.summary}</pre>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

    
