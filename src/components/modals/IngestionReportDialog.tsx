
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface IngestionReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  reportUrl: string;
}

export function IngestionReportDialog({
  isOpen,
  onOpenChange,
  reportUrl,
}: IngestionReportDialogProps) {
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && reportUrl) {
      setIsLoading(true);
      setError(null);
      setReportData(null);
      fetch(reportUrl)
        .then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}. ${errorText}`);
          }
          return response.json();
        })
        .then((data) => {
          setReportData(data);
        })
        .catch((err) => {
          console.error("Error fetching ingestion report:", err);
          setError(err.message || "Could not load report data.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, reportUrl]);

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ingestion Report Details</DialogTitle>
          <DialogDescription>
            Viewing report from: {reportUrl}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 pr-6"> {/* Added pr-6 for scrollbar spacing */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Loading report...</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Report</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {reportData && !isLoading && (
            <pre className="text-xs whitespace-pre-wrap break-all bg-muted/50 p-3 rounded-none">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          )}
        </ScrollArea>
        <Alert variant="default" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>PDF Export Note</AlertTitle>
            <AlertDescription className="text-xs">
                The "Download PDF" button will use your browser's print functionality. Choose "Save as PDF" or "Print to PDF" as the destination in the print dialog.
            </AlertDescription>
        </Alert>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownloadPdf} variant="accent" disabled={!reportData || isLoading}>
            <Download className="mr-2 h-4 w-4"/> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
