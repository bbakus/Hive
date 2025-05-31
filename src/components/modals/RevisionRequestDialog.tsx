
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import type { TaskStatus } from "@/app/(app)/post-production/page"; // Assuming TaskStatus is exported

interface RevisionRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (targetStage: TaskStatus, reason: string) => void;
  taskTitle: string;
  availableStages: { value: TaskStatus; label: string }[];
}

export function RevisionRequestDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  taskTitle,
  availableStages,
}: RevisionRequestDialogProps) {
  const [targetStage, setTargetStage] = useState<TaskStatus | "">(availableStages[0]?.value || "");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setTargetStage(availableStages[0]?.value || "");
      setReason("");
    }
  }, [isOpen, availableStages]);

  const handleSubmit = () => {
    if (!targetStage) {
      // Optionally show a toast or error message
      console.error("Target stage must be selected");
      return;
    }
    if (!reason.trim()) {
      // Optionally show a toast or error message
      console.error("Reason for revision cannot be empty");
      return;
    }
    onSubmit(targetStage as TaskStatus, reason.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Revisions for: {taskTitle}</DialogTitle>
          <DialogDescription>
            Select the stage to return this task to and provide a reason.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="targetStage">Return to Stage</Label>
            <Select
              value={targetStage}
              onValueChange={(value) => setTargetStage(value as TaskStatus)}
            >
              <SelectTrigger id="targetStage">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="revisionReason">Reason for Revisions</Label>
            <Textarea
              id="revisionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what needs to be changed or addressed..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={!targetStage || !reason.trim()}>
            Submit Revisions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
