// src/app/api/ingestion/notify-completion/route.ts
import { NextResponse } from 'next/server';
import type { IngestJobStatus } from '@/services/localUtility'; // Assuming this type is still relevant

export async function POST(request: Request) {
  try {
    const jobCompletionData: IngestJobStatus = await request.json();
    
    console.log("/api/ingestion/notify-completion POST request received with data:", jobCompletionData);
    
    // In a real application, HIVE would:
    // 1. Validate the jobCompletionData.
    // 2. Authenticate the request (ensure it's from a trusted local utility).
    // 3. Update its internal database record for this job ID as "completed".
    // 4. Store the report URL or any summary data.
    // 5. Trigger any HIVE-internal workflows (e.g., update shot statuses, create edit tasks).
    // 6. Potentially use WebSockets or Server-Sent Events to notify connected HIVE web clients about this completion in real-time.

    // For now, we'll just log it and return a success response.
    // HIVE's frontend would then need to be updated to react to this backend change
    // (e.g., by re-fetching job statuses or receiving a WebSocket message).

    return NextResponse.json({ message: "HIVE notified of job completion.", receivedJobId: jobCompletionData.jobId });

  } catch (error) {
    console.error("Error in /api/ingestion/notify-completion:", error);
    return NextResponse.json({ error: "Failed to process job completion notification." }, { status: 500 });
  }
}
