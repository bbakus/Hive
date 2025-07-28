
// src/app/api/projects/[projectId]/jobs/route.ts
import { NextResponse } from 'next/server';
import { format, subDays, addDays } from 'date-fns';

// Mock data - this would come from events associated with the project
const mockJobsForProject: Record<string, Array<{ id: string, name: string, date: string }>> = {
  "proj_g9e_summit_2024": [
    { id: "job_summit_day1", name: "Summit Day 1 Coverage", date: format(new Date(), "yyyy-MM-dd") },
    { id: "job_summit_day2", name: "Summit Day 2 Workshops", date: format(addDays(new Date(), 1), "yyyy-MM-dd") },
  ]
};

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const projectId = params.projectId;
  console.log(`GET /api/projects/${projectId}/jobs request received`);

  // TODO: Implement authentication and authorization checks
  // TODO: Fetch actual jobs/events from a database for the given projectId

  await new Promise(resolve => setTimeout(resolve, 200));

  const jobs = mockJobsForProject[projectId] || [];
  
  return NextResponse.json(jobs);
}
