// Personnel and project roles used across the application

export const PHOTOGRAPHY_ROLES = [
  "Photographer",
  "Videographer", 
  "Editor",
  "Assistant",
  "Producer",
  "Project Manager",
  "Client",
] as const;

export const PROJECT_ROLES = [
  "Project Manager",
  "Lead Photographer", 
  "Photographer",
  "Assistant Photographer",
  "Editor",
  "Assistant Editor",
  "Coordinator",
  "Client Liaison",
  "Technical Director"
] as const;

export const PROJECT_STATUSES = [
  "Planning", 
  "Active", 
  "On Hold", 
  "Completed", 
  "Cancelled"
] as const;

export type PhotographyRole = typeof PHOTOGRAPHY_ROLES[number];
export type ProjectRole = typeof PROJECT_ROLES[number];
export type ProjectStatus = typeof PROJECT_STATUSES[number]; 