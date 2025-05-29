// src/app/api/ingestion/notify-status/route.ts
import { NextResponse } from 'next/server';
import type { IngestJobStatus } from '@/services/localUtility';

export async function POST(request: Request) {
  try {
    const jobStatusUpdate: IngestJobStatus = await request.json();
    
    console.log("/api/ingestion/notify-status POST request received with data:", jobStatusUpdate);
    
    // In a real application, HIVE would:
    // 1. Validate the jobStatusUpdate data.
    // 2. Authenticate the request.
    // 3. Update its internal database record for this job ID with the new status.
    // 4. Potentially use WebSockets or Server-Sent Events to broadcast this status update
    //    to any HIVE web clients currently monitoring this job.

    // For now, we'll just log it and return a success response.
    // HIVE's frontend would then need to be updated to react to this backend change.

    return NextResponse.json({ message: "HIVE received job status update.", receivedJobId: jobStatusUpdate.jobId });

  } catch (error) {
    console.error("Error in /api/ingestion/notify-status:", error);
    return NextResponse.json({ error: "Failed to process job status update." }, { status: 500 });
  }
}
