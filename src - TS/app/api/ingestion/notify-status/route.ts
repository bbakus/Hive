
// src/app/api/ingestion/notify-status/route.ts
// This route is now superseded by /api/ingest-status
// It can be deprecated or removed if the local utility uses /api/ingest-status for all status POSTs.
// For now, let's keep it as a simple logger if it's still called by an older utility version.
import { NextResponse } from 'next/server';
import type { IngestJobStatus } from '../../../../services/localUtility';

export async function POST(request: Request) {
  try {
    const jobStatusUpdate: IngestJobStatus = await request.json();
    
    console.log("DEPRECATED /api/ingestion/notify-status POST request received:", jobStatusUpdate);
    console.log("Please use POST /api/ingest-status for status updates from local utility.");
    
    // TODO: Implement authentication and authorization
    // TODO: Store this status update in HIVE's database
    // TODO: Potentially broadcast this status update to connected HIVE clients

    return NextResponse.json({ message: "HIVE received job status update (deprecated endpoint).", receivedJobId: jobStatusUpdate.jobId });

  } catch (error) {
    console.error("Error in /api/ingestion/notify-status:", error);
    return NextResponse.json({ error: "Failed to process job status update (deprecated endpoint)." }, { status: 500 });
  }
}
