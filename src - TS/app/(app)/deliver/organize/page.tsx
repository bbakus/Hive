
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { FolderIcon as DeprecatedFolderIcon, ImageIcon, PlusCircle, Settings, Info, FolderTree } from "lucide-react"; // Changed Folder to FolderTree
import { ClientGalleryFormDialog, type ClientGalleryFormDialogData, type ClientGallery } from "../../../../components/modals/ClientGalleryFormDialog";
import { format, parseISO } from "date-fns";
import { useToast } from "../../../../hooks/use-toast";
import { Badge } from "../../../../components/ui/badge";
import { cn } from "../../../../lib/utils";
import { useProjectContext } from "../../../../contexts/ProjectContext"; // Import ProjectContext
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";

// Expanded Mock data - deliverableContextName acts as the project name for filtering
const allClientGalleriesMockData: ClientGallery[] = [
    { id: "gal001", galleryName: "Summer Fest Highlights", clientEmail: "clientA@example.com", accessType: "password", password: "password123", allowHighResDownload: true, enableWatermarking: false, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Enjoy the highlights!", deliverableContextName: "Summer Music Festival 2024" },
    { id: "gal002", galleryName: "Tech Conference Keynotes", clientEmail: "clientB@example.com", accessType: "private", allowHighResDownload: false, enableWatermarking: true, expiresOn: null, welcomeMessage: "Keynote recordings for Tech Conference X.", deliverableContextName: "Tech Conference X" },
    { id: "gal003", galleryName: "G9e Summit Live Previews", clientEmail: "internal_stakeholder@g9e.com", accessType: "private", password: "", allowHighResDownload: true, enableWatermarking: true, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Live previews from the G9e Annual Summit 2024.", deliverableContextName: "G9e Annual Summit 2024"},
    { id: "gal004", galleryName: "Corporate Retreat 2023 Photos", clientEmail: "hr@example.com", accessType: "password", password: "securepassword", allowHighResDownload: true, enableWatermarking: false, expiresOn: parseISO("2025-01-15"), welcomeMessage: "Photos from the 2023 Corporate Retreat.", deliverableContextName: "Corporate Retreat 2023"},
    { id: "gal005", galleryName: "Product Launch Q1 Assets", clientEmail: "marketing@example.com", accessType: "private", allowHighResDownload: true, enableWatermarking: true, expiresOn: null, welcomeMessage: "Approved assets for Q1 Product Launch.", deliverableContextName: "Product Launch Q1"},
    { id: "gal006", galleryName: "Summer Fest - Day 2 Candids", clientEmail: "clientA@example.com", accessType: "private", allowHighResDownload: true, enableWatermarking: true, expiresOn: parseISO("2024-12-01"), welcomeMessage: "Day 2 candids.", deliverableContextName: "Summer Music Festival 2024" },
    { id: "gal007", galleryName: "Tech Conference - Workshop Shots", clientEmail: "clientB@example.com", accessType: "password", password:"techy", allowHighResDownload: true, enableWatermarking: false, expiresOn: null, welcomeMessage: "Workshop photos from Tech Conference X.", deliverableContextName: "Tech Conference X" },
];

interface OrganizableClientGallery extends ClientGallery {
  folderId?: string | null;
}

interface Folder {
  id: string;
  name: string;
}

const initialFoldersMock: Folder[] = [
  { id: "folder_completed_2024", name: "Completed Projects 2024" },
  { id: "folder_client_drafts_q4", name: "Client Drafts Q4" },
  { id: "folder_internal_reviews", name: "Internal Review Only" },
  { id: "folder_archive_2023", name: "Archived 2023 Galleries" },
];

const NO_FOLDER_ID = "unassigned";
const ALL_GALLERIES_ID = "all";

export default function OrganizeGalleriesPage() {
  const { selectedProject } = useProjectContext(); // Get selected project
  const [galleries, setGalleries] = useState<OrganizableClientGallery[]>([]);
  const [folders, setFolders] = useState<Folder[]>(initialFoldersMock);
  const { toast } = useToast();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingGalleryForSettings, setEditingGalleryForSettings] = useState<OrganizableClientGallery | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(ALL_GALLERIES_ID);

  useEffect(() => {
    // Filter galleries based on selected project
    const projectGalleries = selectedProject
      ? allClientGalleriesMockData.filter(gallery => gallery.deliverableContextName === selectedProject.name)
      : [];

    // Assign initial folderIds to mock galleries for demonstration
    setGalleries(
      projectGalleries.map((gallery, index) => ({
        ...gallery,
        folderId: index % 3 === 0 ? initialFoldersMock[0]?.id : (index % 3 === 1 ? initialFoldersMock[1]?.id : null),
      }))
    );
    // Reset folder selection when project changes
    setSelectedFolderId(ALL_GALLERIES_ID);
  }, [selectedProject]);

  const handleMoveGallery = (galleryId: string, targetFolderId: string | null) => {
    setGalleries(prevGalleries =>
      prevGalleries.map(gallery =>
        gallery.id === galleryId ? { ...gallery, folderId: targetFolderId === NO_FOLDER_ID ? null : targetFolderId } : gallery
      )
    );
     toast({ title: "Gallery Moved", description: `Gallery moved to ${folders.find(f => f.id === targetFolderId)?.name || "Uncategorized"}.` });
  };

  const handleCreateFolder = () => {
    const newFolderName = prompt("Enter new folder name:");
    if (newFolderName && newFolderName.trim() !== "") {
      const newFolder: Folder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: newFolderName.trim(),
      };
      setFolders(prev => [...prev, newFolder]);
      toast({ title: "Folder Created", description: `Folder "${newFolder.name}" added.` });
    }
  };

  const openSettingsModal = (gallery: OrganizableClientGallery) => {
    setEditingGalleryForSettings(gallery);
    setIsSettingsModalOpen(true);
  };

  const handleSettingsSubmit = (data: ClientGalleryFormDialogData) => {
    if (editingGalleryForSettings) {
      setGalleries(prevGalleries =>
        prevGalleries.map(gallery =>
          gallery.id === editingGalleryForSettings.id
            ? { ...gallery, ...data, expiresOn: data.expiresOn ? data.expiresOn : null }
            : gallery
        )
      );
      toast({ title: "Gallery Settings Updated", description: `Settings for "${data.galleryName}" saved.` });
    }
    setIsSettingsModalOpen(false);
    setEditingGalleryForSettings(null);
  };

  const displayedGalleries = useMemo(() => {
    if (!selectedProject) return []; // No galleries if no project selected

    let projectGalleries = galleries; // galleries state is already project-filtered

    if (selectedFolderId === ALL_GALLERIES_ID) {
      return projectGalleries;
    }
    if (selectedFolderId === NO_FOLDER_ID) {
      return projectGalleries.filter(g => !g.folderId);
    }
    return projectGalleries.filter(g => g.folderId === selectedFolderId);
  }, [galleries, selectedFolderId, selectedProject]);

  if (!selectedProject) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="h-8 w-8 text-accent" /> Organize Galleries
          </p>
          <p className="text-muted-foreground">
            Manage the structure, organization, and settings of your galleries for the selected project.
          </p>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the main header to organize its galleries.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FolderTree className="h-8 w-8 text-accent" /> Organize Galleries
        </p>
        <p className="text-muted-foreground">
          Organize galleries for project: <span className="font-semibold text-foreground">{selectedProject.name}</span>.
        </p>
      </div>

      {editingGalleryForSettings && (
        <ClientGalleryFormDialog
            isOpen={isSettingsModalOpen}
            onOpenChange={setIsSettingsModalOpen}
            onSubmit={handleSettingsSubmit}
            contextName={editingGalleryForSettings.deliverableContextName} // This context name is effectively the project name
            editingGallery={editingGalleryForSettings}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Folders Panel */}
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Folders</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCreateFolder}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Folder
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => setSelectedFolderId(ALL_GALLERIES_ID)}
              className={cn(
                "w-full justify-start px-3 py-2 text-sm",
                selectedFolderId === ALL_GALLERIES_ID && "bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground"
              )}
            >
              <DeprecatedFolderIcon className="mr-2 h-4 w-4 text-muted-foreground" /> All Galleries
            </Button>
            {folders.length > 0 ? (
              folders.map(folder => (
                <Button
                  key={folder.id}
                  variant="ghost"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "w-full justify-start px-3 py-2 text-sm",
                    selectedFolderId === folder.id && "bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground"
                  )}
                >
                  <DeprecatedFolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {folder.name}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-3 text-center">No folders created yet.</p>
            )}
             <Button
                variant="ghost"
                onClick={() => setSelectedFolderId(NO_FOLDER_ID)}
                className={cn(
                  "w-full justify-start px-3 py-2 text-sm italic",
                  selectedFolderId === NO_FOLDER_ID && "bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground"
                )}
            >
                <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                Uncategorized Galleries
            </Button>
          </CardContent>
        </Card>

        {/* Galleries Area */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedFolderId === ALL_GALLERIES_ID ? `All Galleries for ${selectedProject.name}`
               : selectedFolderId === NO_FOLDER_ID ? `Uncategorized Galleries for ${selectedProject.name}`
               : `Galleries in "${folders.find(f => f.id === selectedFolderId)?.name || 'Folder'}" (for ${selectedProject.name})`}
            </CardTitle>
            <CardDescription>Assign galleries to folders or edit their settings. ({displayedGalleries.length} galleries shown)</CardDescription>
          </CardHeader>
          <CardContent>
            {displayedGalleries.length > 0 ? (
              <div className="space-y-4">
                {displayedGalleries.map(gallery => (
                  <Card key={gallery.id} className="bg-muted/30 shadow-none">
                    <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <ImageIcon className="h-8 w-8 text-accent flex-shrink-0" />
                                <div className="min-w-0">
                                <p className="font-medium truncate" title={gallery.galleryName}>{gallery.galleryName}</p>
                                <p className="text-xs text-muted-foreground truncate" title={gallery.clientEmail}>
                                    Client: {gallery.clientEmail}
                                </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openSettingsModal(gallery)}>
                                    <Settings className="mr-1.5 h-3.5 w-3.5" /> Settings
                                </Button>
                                <Select
                                    value={gallery.folderId || NO_FOLDER_ID}
                                    onValueChange={(value) => handleMoveGallery(gallery.id, value)}
                                >
                                    <SelectTrigger className="h-8 text-xs w-40">
                                        <SelectValue placeholder="Move to folder..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NO_FOLDER_ID} className="italic">Uncategorized</SelectItem>
                                        {folders.map(folder => (
                                        <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/50 pt-2 mt-2">
                            <p>Current Folder: <span className="font-medium text-foreground/80">{folders.find(f => f.id === gallery.folderId)?.name || "Uncategorized"}</span></p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                <p>Access: <Badge variant="outline" className="text-xs">{gallery.accessType === 'password' ? 'Password Protected' : gallery.accessType.charAt(0).toUpperCase() + gallery.accessType.slice(1)}</Badge></p>
                                <p>Downloads: <Badge variant={gallery.allowHighResDownload ? "secondary" : "outline"} className="text-xs">{gallery.allowHighResDownload ? "Hi-Res Enabled" : "Previews Only"}</Badge></p>
                                <p>Watermark: <Badge variant={gallery.enableWatermarking ? "secondary" : "outline"} className="text-xs">{gallery.enableWatermarking ? "Enabled" : "Disabled"}</Badge></p>
                                {gallery.expiresOn && <p>Expires: <Badge variant="outline" className="text-xs">{format(gallery.expiresOn, "PPP")}</Badge></p>}
                            </div>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {galleries.length === 0 ? `No galleries found for project "${selectedProject.name}".` : `No galleries in "${folders.find(f => f.id === selectedFolderId)?.name || (selectedFolderId === NO_FOLDER_ID ? 'Uncategorized' : 'this selection')}" for this project.`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


      