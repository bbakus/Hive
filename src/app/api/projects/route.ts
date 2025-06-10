
// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { format, subDays, addDays } from 'date-fns';
import type { Project } from '@/contexts/ProjectContext'; // Assuming Project type is still relevant

// Mock data - in a real app, this would come from a database
// And would be filtered by authenticated user's organization/permissions
const mockProjectsForApi: Array<{ id: string, name: string, client: string, organizationId?: string }> = [
  {
    id: "proj_g9e_summit_2024",
    name: "G9e Annual Summit 2024",
    client: "G9e Internal", // Added client field
    organizationId: "org_g9e",
  },
  // Add more mock projects if needed for testing the API
];

export async function GET(request: Request) {
  // TODO: Implement actual authentication and authorization checks
  // TODO: Fetch projects from a database based on user context

  // In a production environment with multiple local utilities polling this endpoint,
  // considerations for API rate limiting, database query optimization, and caching
  // would be crucial for performance and stability.

  console.log("GET /api/projects request received by HIVE placeholder API");
  // For now, return mock data
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const responseProjects = mockProjectsForApi.map(p => ({
    id: p.id,
    name: p.name,
    client: p.client,
    organizationId: p.organizationId // Ensure organizationId is returned
  }));

  return NextResponse.json(responseProjects);
}

