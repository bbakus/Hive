
"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Star, AlertCircle, Heart, MessageSquare, DownloadCloud, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ClientGallery } from '@/components/modals/ClientGalleryFormDialog'; 
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

// Mock Gallery Data - Adjusted to better reflect new spec context
const mockGalleries: ClientGallery[] = [
    { id: "gal001", galleryName: "Quick Turn Selects", clientEmail: "clientA@example.com", accessType: "password", password: "password123", allowHighResDownload: true, enableWatermarking: true, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Enjoy these quick turnaround selects from the event!", deliverableContextName: "Day 1 (2024-07-15) - Summer Music Festival Main Stage" },
    { id: "gal002", galleryName: "Final Keynote Shots", clientEmail: "clientB@example.com", accessType: "private", allowHighResDownload: false, enableWatermarking: false, expiresOn: null, welcomeMessage: "Final approved keynote photography from Tech Conference X.", deliverableContextName: "Day 1 (2024-09-15) - Tech Conference Keynote Speech" },
    { id: "gal003", galleryName: "Live Previews", clientEmail: "internal_stakeholder@g9e.com", accessType: "private", password: "", allowHighResDownload: true, enableWatermarking: true, expiresOn: parseISO("2024-12-31"), welcomeMessage: "Live previews from the G9e Annual Summit 2024.", deliverableContextName: "Day 2 (2024-10-02) - G9e Summit General Session"},
    { id: "mockId", galleryName: "Behind the Scenes", clientEmail: "test@example.com", accessType: "public", allowHighResDownload: true, enableWatermarking: false, expiresOn: null, welcomeMessage: "A look behind the scenes of the Mock Project.", deliverableContextName: "Day 1 (2024-01-01) - Mock Project Kickoff" },
];

const mockImageUrls = Array.from({ length: 12 }, (_, i) => ({
  src: `https://placehold.co/600x400.png?text=Image+${i + 1}`,
  alt: `Placeholder Image ${i + 1}`,
  id: `img_${i + 1}`,
  hint: i % 4 === 0 ? "event photography" : (i % 4 === 1 ? "conference presentation" : (i % 4 === 2 ? "product launch display" : "networking event")),
}));

export default function ClientGalleryViewPage() {
  const params = useParams();
  const galleryId = params.galleryId as string;
  const [gallery, setGallery] = useState<ClientGallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoritedImages, setFavoritedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const foundGallery = mockGalleries.find(g => g.id === galleryId);
    if (foundGallery) {
      setGallery(foundGallery);
    } else if (galleryId === "mockId" && !foundGallery) {
        setGallery(mockGalleries.find(g => g.id === "mockId") || null);
    }
    else {
      setError("Gallery not found or access denied.");
    }
    setIsLoading(false);
    setFavoritedImages(new Set()); // Reset favorites when gallery changes
  }, [galleryId]);

  const handleImageClick = (imageId: string) => {
    // Placeholder for opening image viewer modal
    console.log(`Image ${imageId} clicked. Future: Open image viewer modal with metadata overlay (timestamp, photographer, event code).`);
    alert(`Image ${imageId} clicked. Future: Open image viewer modal with metadata overlay (timestamp, photographer, event code).`);
  };

  const toggleFavorite = (imageId: string) => {
    setFavoritedImages(prevFavorites => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(imageId)) {
        newFavorites.delete(imageId);
      } else {
        newFavorites.add(imageId);
      }
      return newFavorites;
    });
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading gallery...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">{error}</div>;
  }

  if (!gallery) {
    return <div className="container mx-auto p-4 text-center">Gallery data could not be loaded.</div>;
  }

  const contextParts = gallery.deliverableContextName.split(" - ");
  const dayInfo = contextParts[0] || "Project Day";
  const eventInfo = contextParts.slice(1).join(" - ") || "Event";

  return (
    <div className="min-h-screen bg-muted/40">
      <main className="container mx-auto p-0 pt-2 md:p-4 md:pt-4">
         <Card className="mb-8 bg-card shadow-none border-0">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 pt-4 px-4 md:px-6">
            <div>
              <CardTitle className="text-xl sm:text-2xl">{gallery.galleryName}</CardTitle>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Client: {gallery.clientEmail}</span>
                {gallery.expiresOn && (
                  <Badge variant="outline" className="text-xs">
                      Expires: {format(gallery.expiresOn, "PPP")}
                  </Badge>
                )}
                {gallery.accessType === "password" && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Password Protected
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 sm:mt-0 self-start sm:self-center">
              {gallery.allowHighResDownload && (
                  <Button variant="accent" size="sm">
                      <Download className="mr-2 h-4 w-4" /> Download All
                  </Button>
              )}
              <Button variant="outline" size="sm">
                  <Heart className="mr-2 h-4 w-4" fill={favoritedImages.size > 0 ? "currentColor" : "none"} /> 
                  My Favorites ({favoritedImages.size})
              </Button>
            </div>
          </CardHeader>
          {gallery.welcomeMessage && (
            <CardContent className="px-4 md:px-6 pt-0 pb-3">
                <p className="text-sm text-foreground">{gallery.welcomeMessage}</p>
            </CardContent>
          )}
        </Card>
        
        <div className="mb-6 p-3 bg-secondary/30 rounded-none text-sm text-muted-foreground">
            <Button variant="link" size="sm" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground" disabled>
              {dayInfo}
            </Button>
            <span className="mx-1">/</span>
            <Button variant="link" size="sm" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground" disabled>
              {eventInfo}
            </Button>
            <span className="mx-1">/</span>
            <span className="font-semibold text-foreground">{gallery.galleryName}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {mockImageUrls.map((image) => {
            const isFavorited = favoritedImages.has(image.id);
            return (
              <Card 
                  key={image.id} 
                  className="overflow-hidden group relative border-0 shadow-none rounded-none cursor-pointer"
                  onClick={() => handleImageClick(image.id)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={600}
                  height={400}
                  className="aspect-video w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  data-ai-hint={image.hint}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  {/* Overlay content appears on hover */}
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white bg-black/40 hover:bg-black/60 hover:text-white p-1" title="Download" onClick={(e) => {e.stopPropagation(); console.log('Download clicked for', image.id); alert('Download per image: TBD');}}>
                      <DownloadCloud className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "h-7 w-7 bg-black/40 hover:bg-black/60 p-1",
                        isFavorited ? "text-red-500 hover:text-red-400" : "text-white hover:text-white"
                    )}
                    title={isFavorited ? "Unfavorite" : "Favorite"} 
                    onClick={(e) => {e.stopPropagation(); toggleFavorite(image.id);}}
                  >
                      <Heart className="h-4 w-4" fill={isFavorited ? "currentColor" : "none"} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white bg-black/40 hover:bg-black/60 hover:text-white p-1" title="Comment" onClick={(e) => {e.stopPropagation(); console.log('Comment clicked for', image.id); alert('Comment: TBD');}}>
                      <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white bg-black/40 hover:bg-black/60 hover:text-white p-1" title="Report Issue" onClick={(e) => {e.stopPropagation(); console.log('Report clicked for', image.id); alert('Report Image: TBD');}}>
                      <AlertCircle className="h-4 w-4" />
                  </Button>
                </div>
                {gallery.enableWatermarking && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-3xl sm:text-5xl font-bold text-white/25 transform -rotate-12 select-none opacity-70">
                          HIVE PREVIEW
                      </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        <p>Powered by HIVE. Gallery for {gallery.galleryName}.</p>
        <p>&copy; {new Date().getFullYear()} HIVE Media Solutions</p>
      </footer>
    </div>
  );
}

