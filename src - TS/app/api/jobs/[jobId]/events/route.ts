
// src/app/api/jobs/[jobId]/events/route.ts
import { NextResponse } from 'next/server';
import { formatISO } from 'date-fns';

// Mock data - this would correspond to detailed event timings for a job
const mockEventsForJob: Record<string, Array<{ id: string, name: string, start: string, end: string }>> = {
  "job_summit_day1": [
    { id: "evt_summit_d1_keynote", name: "Opening Keynote", start: formatISO(new Date().setHours(9,0,0,0)), end: formatISO(new Date().setHours(10,30,0,0)) },
    { id: "evt_summit_d1_session1", name: "Breakout Session 1A", start: formatISO(new Date().setHours(11,0,0,0)), end: formatISO(new Date().setHours(12,0,0,0)) },
  ]
};

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  console.log(`GET /api/jobs/${jobId}/events request received`);

  // TODO: Implement authentication and authorization checks
  // TODO: Fetch actual event details for the given jobId from a database

  await new Promise(resolve => setTimeout(resolve, 200));

  const events = mockEventsForJob[jobId] || [];
  
  return NextResponse.json(events);
}
