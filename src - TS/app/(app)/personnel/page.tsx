
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { PlusCircle, Edit, Trash2, Filter } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useToast } from "../../../hooks/use-toast";
import { usePersonnelContext, type Personnel } from "../../../contexts/PersonnelContext";
import { cn } from "../../../lib/utils";
import { PersonnelFormDialog, type PersonnelFormDialogData } from "../../../components/modals/PersonnelFormDialog";

export default function PersonnelPage() {
  const { personnelList, addPersonnel, updatePersonnel, deletePersonnel, isLoadingPersonnel } = usePersonnelContext();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(null);
  const [filterText, setFilterText] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  if (isLoadingPersonnel) {
    return <div className="p-4">Loading personnel data...</div>;
  }

  const handleAddPersonnelSubmit = async (data: PersonnelFormDialogData) => {
    try {
      await addPersonnel(data);
      toast({
        title: "Personnel Added",
        description: `"${data.name}" has been successfully added to the team.`,
      });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding personnel:', error);
      toast({
        title: "Error",
        description: "Failed to add personnel. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPersonnelSubmit = async (data: PersonnelFormDialogData) => {
    if (editingPersonnel) {
      try {
        await updatePersonnel(editingPersonnel.personnelId, data);
        toast({
          title: "Personnel Updated",
          description: `"${data.name}" has been successfully updated.`,
        });
        setIsEditModalOpen(false);
        setEditingPersonnel(null);
      } catch (error) {
        console.error('Error updating personnel:', error);
        toast({
          title: "Error", 
          description: "Failed to update personnel. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const openEditPersonnelModal = (personnel: Personnel) => {
    setEditingPersonnel(personnel);
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (personnel: Personnel) => {
    setPersonnelToDelete(personnel);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (personnelToDelete) {
      try {
        await deletePersonnel(personnelToDelete.personnelId);
        toast({
          title: "Personnel Removed",
          description: `"${personnelToDelete.name}" has been removed from the team.`,
        });
        setIsDeleteDialogOpen(false);
        setPersonnelToDelete(null);
      } catch (error) {
        console.error('Error deleting personnel:', error);
        toast({
          title: "Error",
          description: "Failed to remove personnel. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const displayPersonnel = useMemo(() => {
    let filtered = [...personnelList];

    if (filterText) {
      filtered = filtered.filter(personnel =>
        personnel.name.toLowerCase().includes(filterText.toLowerCase()) ||
        personnel.email.toLowerCase().includes(filterText.toLowerCase()) ||
        personnel.role.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(personnel => personnel.role === roleFilter);
    }

    return filtered;
  }, [personnelList, filterText, roleFilter]);

  const availableRoles = useMemo(() => {
    const roles = new Set(personnelList.map(p => p.role));
    return Array.from(roles).sort();
  }, [personnelList]);

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">
          Manage your team members and their roles.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {availableRoles.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)} 
          className={cn(buttonVariants({ variant: "default" }), "ml-auto")}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
          <CardDescription>
            {displayPersonnel.length} team member{displayPersonnel.length !== 1 ? 's' : ''} found
            {filterText || roleFilter !== "all" ? ` matching your criteria` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayPersonnel.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPersonnel.map((personnel) => (
                  <TableRow key={personnel.personnelId}>
                    <TableCell className="font-medium">{personnel.name}</TableCell>
                    <TableCell>{personnel.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{personnel.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={personnel.availability === 'Available' ? 'default' : 'secondary'}>
                        {personnel.availability}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-foreground/80"
                          onClick={() => openEditPersonnelModal(personnel)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-destructive"
                          onClick={() => openDeleteDialog(personnel)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {filterText ? "No team members found matching your filter." : "Add a new team member to get started."}
            </div>
          )}
        </CardContent>
      </Card>

      <PersonnelFormDialog
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddPersonnelSubmit}
        editingPersonnel={null}
      />

      <PersonnelFormDialog
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleEditPersonnelSubmit}
        editingPersonnel={editingPersonnel}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{personnelToDelete?.name}" from the team.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
