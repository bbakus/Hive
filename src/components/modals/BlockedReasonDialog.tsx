
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface BlockedReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shotDescription: string;
  initialReason: string;
  onSave: (reason: string) => void;
}

export function BlockedReasonDialog({
  isOpen,
  onOpenChange,
  shotDescription,
  initialReason,
  onSave,
}: BlockedReasonDialogProps) {
  const [reason, setReason] = useState(initialReason);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
    }
  }, [isOpen, initialReason]);

  const handleSave = () => {
    onSave(reason);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for Blocking Shot</DialogTitle>
          <DialogDescription>
            Provide a reason for blocking the shot: "{shotDescription.substring(0, 50)}...".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="blockedReasonInput" className="sr-only">Blocked Reason</Label>
          <Textarea
            id="blockedReasonInput"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Talent unavailable, Equipment malfunction, Location access issue..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Reason & Block Shot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    