
"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Star, AlertCircle, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ClientGallery } from '@/components/modals/ClientGalleryFormDialog'; // Use the actual type

// Mock Gallery Data - In a real app, this would come from a context or API
const mockGalleries: ClientGallery[] = [
    { id: "gal001", galleryName: "Summer Fest Highlights", clientEmail: "clientA@example.com", accessType: "password", password: "password123", allowHighResDownload: true, enableWatermarking: false, expiresOn: new Date("2024-12-31"), welcomeMessage: "Enjoy the highlights!", deliverableContextName: "Summer Music Festival 2024" },
    { id: "gal002", galleryName: "Tech Conference Keynotes", clientEmail: "clientB@example.com", accessType: "private", allowHighResDownload: false, enableWatermarking: true, expiresOn: null, welcomeMessage: "Keynote recordings for Tech Conference X.", deliverableContextName: "Tech Conference X" },
    { id: "mockId", galleryName: "Client Showcase Gallery", clientEmail: "test@example.com", accessType: "public", allowHighResDownload: true, enableWatermarking: false, expiresOn: null, welcomeMessage: "Welcome to your preview gallery!", deliverableContextName: "Mock Project" },
];

const mockImageUrls = Array.from({ length: 12 }, (_, i) => ({
  src: `https://placehold.co/600x400.png?text=Image+${i + 1}`,
  alt: `Placeholder Image ${i + 1}`,
  id: `img_${i + 1}`,
  hint: i % 3 === 0 ? "event photography" : (i % 3 === 1 ? "conference presentation" : "product launch display"),
}));

export default function ClientGalleryViewPage() {
  const params = useParams();
  const galleryId = params.galleryId as string;
  const [gallery, setGallery] = useState<ClientGallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    // Simulate fetching gallery data
    const foundGallery = mockGalleries.find(g => g.id === galleryId);
    if (foundGallery) {
      setGallery(foundGallery);
    } else if (galleryId === "mockId" && !foundGallery) { // Fallback for generic mockId viewing
        setGallery(mockGalleries.find(g => g.id === "mockId") || null);
    }
    else {
      setError("Gallery not found or access denied.");
    }
    setIsLoading(false);
  }, [galleryId]);

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading gallery...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">{error}</div>;
  }

  if (!gallery) {
    return <div className="container mx-auto p-4 text-center">Gallery data could not be loaded.</div>;
  }

  // TODO: Implement password protection if gallery.accessType === 'password'

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background shadow-sm sticky top-0 z-40">
        <div className="container mx-auto p-4 flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{gallery.galleryName}</h1>
            <p className="text-sm text-muted-foreground">Client: {gallery.clientEmail}</p>
            {gallery.expiresOn && (
                <Badge variant="outline" className="mt-1 text-xs">
                    Expires: {format(gallery.expiresOn, "PPP")}
                </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            {gallery.allowHighResDownload && (
                <Button variant="accent" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Download All
                </Button>
            )}
            <Button variant="outline" size="sm" disabled>
                <Star className="mr-2 h-4 w-4" /> My Favorites (0)
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {gallery.welcomeMessage && (
            <Card className="mb-6 bg-background/80">
                <CardContent className="p-4">
                    <p className="text-sm text-foreground">{gallery.welcomeMessage}</p>
                </CardContent>
            </Card>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockImageUrls.map((image, index) => (
            <Card key={image.id} className="overflow-hidden group relative border-0 shadow-none">
              <Image
                src={image.src}
                alt={image.alt}
                width={600}
                height={400}
                className="aspect-video w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={image.hint}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs text-white truncate">{image.alt}</p>
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-white hover:bg-white/20 hover:text-white p-1" title="Favorite">
                    <Heart className="h-4 w-4" />
                </Button>
              </div>
              {gallery.enableWatermarking && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-2xl sm:text-4xl font-bold text-white/20 transform -rotate-12 select-none">
                        HIVE Preview
                    </span>
                </div>
              )}
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
            <Button variant="outline" disabled>
                <AlertCircle className="mr-2 h-4 w-4" /> Report an Issue
            </Button>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        <p>Powered by HIVE. Gallery for {gallery.galleryName}.</p>
      </footer>
    </div>
  );
}
