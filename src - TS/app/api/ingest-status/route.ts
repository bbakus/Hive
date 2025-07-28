
// src/app/api/ingest-status/route.ts
import { NextResponse } from 'next/server';

interface IngestStatusPayload {
  jobId: string;
  userId: string;
  status: "pending" | "processing" | "copying" | "checksumming" | "completed" | "failed" | "cancelled";
  progress?: number;
  filesProcessed?: number;
  totalFiles?: number;
  message?: string;
  errors?: string[];
}

export async function POST(request: Request) {
  try {
    const payload: IngestStatusPayload = await request.json();
    console.log(`POST /api/ingest-status received for Job ID ${payload.jobId}:`, payload);

    // TODO: Implement authentication and authorization
    // TODO: Store this status update in a database associated with the jobId
    // TODO: Potentially trigger real-time updates to connected HIVE clients (e.g., via WebSockets)

    // For now, just acknowledge receipt
    return NextResponse.json({ ok: true, message: "Status received by HIVE" });

  } catch (error) {
    console.error("Error in /api/ingest-status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to process ingest status update.", details: errorMessage }, { status: 500 });
  }
}
