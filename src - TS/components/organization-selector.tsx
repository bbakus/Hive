
"use client";

import { useOrganizationContext, ALL_ORGANIZATIONS_ID, type Organization } from "../contexts/OrganizationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Briefcase } from "lucide-react"; // Using Briefcase for organization

export function OrganizationSelector() {
  const { 
    organizations, 
    selectedOrganizationId, 
    setSelectedOrganizationId, 
    isLoadingOrganizations 
  } = useOrganizationContext();

  return (
    <div className="flex items-center gap-2">
      <Briefcase className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedOrganizationId ?? "all"} // Use "all" for the value of "All My Organizations"
        onValueChange={(value) => {
          setSelectedOrganizationId(value === "all" ? ALL_ORGANIZATIONS_ID : value);
        }}
        disabled={isLoadingOrganizations || organizations.length === 0}
      >
        <SelectTrigger className="w-[200px] md:w-[280px] h-9">
          <SelectValue placeholder="Select an organization" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All My Organizations</SelectItem>
          {organizations.map((org: Organization) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
          {organizations.length === 0 && !isLoadingOrganizations && (
            <p className="p-2 text-xs text-muted-foreground text-center">No organizations available.</p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
