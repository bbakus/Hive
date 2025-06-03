
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder as FolderIcon, ImageIcon, PlusCircle } from "lucide-react";
import type { ClientGallery } from "@/components/modals/ClientGalleryFormDialog"; // Assuming this is the correct path
import { format, parseISO } from "date-fns";

// Mock data - ideally, this would come from a context or API in a real app
// For now, we use a copy of the mock data similar to the Deliverables page
const initialClientGalleriesMockData: ClientGallery[] = [
    { id: "gal001", galleryName: "Summer Fest Highlights", clientEmail: "clientA@example.com", accessType: "password", password: "password123", allowHighResDownload: true, enableWatermarking: false, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Enjoy the highlights!", deliverableContextName: "Summer Music Festival 2024" },
    { id: "gal002", galleryName: "Tech Conference Keynotes", clientEmail: "clientB@example.com", accessType: "private", allowHighResDownload: false, enableWatermarking: true, expiresOn: null, welcomeMessage: "Keynote recordings for Tech Conference X.", deliverableContextName: "Tech Conference X" },
    { id: "gal003", galleryName: "G9e Summit Live Previews", clientEmail: "internal_stakeholder@g9e.com", accessType: "private", password: "", allowHighResDownload: true, enableWatermarking: true, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Live previews from the G9e Annual Summit 2024.", deliverableContextName: "G9e Annual Summit 2024"},
    { id: "gal004", galleryName: "Corporate Retreat 2023 Photos", clientEmail: "hr@example.com", accessType: "password", password: "securepassword", allowHighResDownload: true, enableWatermarking: false, expiresOn: parseISO("2025-01-15"), welcomeMessage: "Photos from the 2023 Corporate Retreat.", deliverableContextName: "Corporate Retreat 2023"},
    { id: "gal005", galleryName: "Product Launch Q1 Assets", clientEmail: "marketing@example.com", accessType: "private", allowHighResDownload: true, enableWatermarking: true, expiresOn: null, welcomeMessage: "Approved assets for Q1 Product Launch.", deliverableContextName: "Product Launch Q1"},
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

export default function OrganizeGalleriesPage() {
  const [galleries, setGalleries] = useState<OrganizableClientGallery[]>([]);
  const [folders, setFolders] = useState<Folder[]>(initialFoldersMock);

  useEffect(() => {
    // Initialize galleries with a folderId (e.g., assign some to mock folders or leave as null/unassigned)
    setGalleries(
      initialClientGalleriesMockData.map((gallery, index) => ({
        ...gallery,
        folderId: index % 4 === 0 ? initialFoldersMock[0]?.id : (index % 4 === 1 ? initialFoldersMock[1]?.id : null),
      }))
    );
  }, []);

  const handleMoveGallery = (galleryId: string, targetFolderId: string | null) => {
    setGalleries(prevGalleries =>
      prevGalleries.map(gallery =>
        gallery.id === galleryId ? { ...gallery, folderId: targetFolderId === NO_FOLDER_ID ? null : targetFolderId } : gallery
      )
    );
  };

  const handleCreateFolder = () => {
    // Placeholder for now
    const newFolderName = prompt("Enter new folder name:");
    if (newFolderName && newFolderName.trim() !== "") {
      const newFolder: Folder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: newFolderName.trim(),
      };
      setFolders(prev => [...prev, newFolder]);
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FolderIcon className="h-8 w-8 text-accent" /> Organize Client Galleries
        </p>
        <p className="text-muted-foreground">
          Manage the structure and organization of your client-facing galleries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Folders Panel */}
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Folders</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCreateFolder}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Folder
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {folders.length > 0 ? (
              folders.map(folder => (
                <Button
                  key={folder.id}
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-sm"
                  // onClick={() => setSelectedFolderId(folder.id)} // For filtering view later
                >
                  <FolderIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {folder.name}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-3 text-center">No folders created yet.</p>
            )}
             <Button
                variant="ghost"
                className="w-full justify-start px-3 py-2 text-sm italic"
                // onClick={() => setSelectedFolderId(NO_FOLDER_ID)} // For filtering view later
            >
                <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                Uncategorized Galleries
            </Button>
          </CardContent>
        </Card>

        {/* Galleries Area */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg">All Client Galleries</CardTitle>
            <CardDescription>Assign galleries to folders using the dropdown.</CardDescription>
          </CardHeader>
          <CardContent>
            {galleries.length > 0 ? (
              <div className="space-y-4">
                {galleries.map(gallery => (
                  <Card key={gallery.id} className="bg-muted/30 shadow-none">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        <ImageIcon className="h-8 w-8 text-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate" title={gallery.galleryName}>{gallery.galleryName}</p>
                          <p className="text-xs text-muted-foreground truncate" title={gallery.clientEmail}>
                            Client: {gallery.clientEmail} | For: {gallery.deliverableContextName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Current Folder: <span className="font-medium text-foreground/80">{folders.find(f => f.id === gallery.folderId)?.name || "Uncategorized"}</span>
                          </p>
                        </div>
                      </div>
                      <div className="w-full sm:w-56 flex-shrink-0 mt-2 sm:mt-0">
                        <Select
                          value={gallery.folderId || NO_FOLDER_ID}
                          onValueChange={(value) => handleMoveGallery(gallery.id, value)}
                        >
                          <SelectTrigger className="h-9 text-xs">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No galleries available to organize.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
