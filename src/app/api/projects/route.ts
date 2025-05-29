// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { format, subDays, addDays } from 'date-fns';
import type { Project } from '@/contexts/ProjectContext'; // Adjust path if needed

// Mock data - in a real app, this would come from a database
const mockProjects: Project[] = [
  {
    id: "proj_g9e_summit_2024",
    name: "G9e Annual Summit 2024",
    startDate: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 2), "yyyy-MM-dd"),
    status: "In Progress",
    description: "Comprehensive photographic coverage of the G9e Annual Summit 2024 over 4 days, involving 4 key photographers.",
    location: "Grand Conference Center, Metropolis",
    keyPersonnel: [
      { personnelId: "user003", name: "Charlie Chaplin", projectRole: "Project Manager" },
      { personnelId: "user005", name: "Edward Scissorhands", projectRole: "Lead Editor" },
    ],
    organizationId: "org_g9e",
    createdByUserId: "user_admin_demo",
  }
];

export async function GET(request: Request) {
  // In a real app, you would:
  // 1. Authenticate the user/service making the request.
  // 2. Fetch projects from your database based on user's organization/permissions.
  console.log("/api/projects GET request received");
  // For now, return mock data
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // const url = new URL(request.url);
  // const organizationId = url.searchParams.get('organizationId');
  // let filteredProjects = mockProjects;
  // if (organizationId) {
  //   filteredProjects = mockProjects.filter(p => p.organizationId === organizationId);
  // }

  return NextResponse.json(mockProjects);
}
