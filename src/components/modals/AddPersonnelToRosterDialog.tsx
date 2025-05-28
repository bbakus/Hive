
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PHOTOGRAPHY_ROLES } from "@/app/(app)/personnel/page";

const allPossibleCapabilities = PHOTOGRAPHY_ROLES;

export interface WizardAvailablePersonnel {
  id: string;
  name: string;
  capabilities: typeof PHOTOGRAPHY_ROLES[number][];
}

interface AddPersonnelToRosterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPersonnelAdded: (newPersonnel: WizardAvailablePersonnel) => void;
}

export function AddPersonnelToRosterDialog({
  isOpen,
  onOpenChange,
  onPersonnelAdded,
}: AddPersonnelToRosterDialogProps) {
  const [newPersonnelName, setNewPersonnelName] = useState("");
  const [newPersonnelCapabilities, setNewPersonnelCapabilities] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleSave = () => {
    if (!newPersonnelName.trim()) {
      toast({ title: "Error", description: "New personnel name cannot be empty.", variant: "destructive" });
      return;
    }
    const selectedCapabilities = Object.entries(newPersonnelCapabilities)
      .filter(([, isSelected]) => isSelected)
      .map(([capability]) => capability as typeof PHOTOGRAPHY_ROLES[number]);

    if (selectedCapabilities.length === 0) {
      toast({ title: "Error", description: "Please select at least one capability.", variant: "destructive" });
      return;
    }

    const newId = `user_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPerson: WizardAvailablePersonnel = {
      id: newId,
      name: newPersonnelName.trim(),
      capabilities: selectedCapabilities,
    };
    onPersonnelAdded(newPerson);
    toast({ title: "Team Member Added", description: `${newPerson.name} added to roster and selected for this project.` });
    setNewPersonnelName("");
    setNewPersonnelCapabilities({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNewPersonnelName("");
    setNewPersonnelCapabilities({});
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Team Member to Roster</DialogTitle>
          <DialogDescription>
            Define the new team member's name and their general capabilities.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-personnel-name" className="text-right">Name</Label>
            <Input
              id="new-personnel-name"
              value={newPersonnelName}
              onChange={(e) => setNewPersonnelName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-1">Capabilities</Label>
            <ScrollArea className="col-span-3 h-40 rounded-md border p-2">
              <div className="space-y-1">
                {allPossibleCapabilities.map(cap => (
                  <div key={cap} className="flex items-center gap-2">
                    <Checkbox
                      id={`cap-${cap}`}
                      checked={!!newPersonnelCapabilities[cap]}
                      onCheckedChange={(checked) => {
                        setNewPersonnelCapabilities(prev => ({ ...prev, [cap]: !!checked }));
                      }}
                    />
                    <Label htmlFor={`cap-${cap}`} className="font-normal text-sm">{cap}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save New Member</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    