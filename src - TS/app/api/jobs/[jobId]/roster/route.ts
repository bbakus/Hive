
// src/app/api/jobs/[jobId]/roster/route.ts
import { NextResponse } from 'next/server';

// Mock data - this would come from personnel assigned to the job/event
const mockRosterForJob: Record<string, Array<{ id: string, name: string, cameraSerials: string[] }>> = {
  "job_summit_day1": [
    { id: "user001", name: "Alice Wonderland", cameraSerials: ["SN12345A", "SN12345B"] },
    { id: "user002", name: "Bob The Builder", cameraSerials: ["SN98765E"] },
  ],
  "job_summit_day2": [
    { id: "user004", name: "Diana Prince", cameraSerials: ["SN11223F"] },
  ]
};

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  console.log(`GET /api/jobs/${jobId}/roster request received`);

  // TODO: Implement authentication and authorization checks
  // TODO: Fetch actual roster for the given jobId from a database

  await new Promise(resolve => setTimeout(resolve, 200));

  const roster = mockRosterForJob[jobId] || [];
  
  return NextResponse.json(roster);
}
