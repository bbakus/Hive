
// src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';

interface NotificationPayload {
  userId: string;
  type: "ingest-complete" | "ingest-error" | string; // Allow other types
  message: string;
  jobId?: string;
}

export async function POST(request: Request) {
  try {
    const payload: NotificationPayload = await request.json();
    console.log(`POST /api/notifications received for User ID ${payload.userId}:`, payload);

    // TODO: Implement authentication and authorization
    // TODO: Store this notification
    // TODO: Push notification to the user via WebSockets or other real-time mechanism

    // For now, just acknowledge receipt
    return NextResponse.json({ ok: true, message: "Notification received by HIVE" });

  } catch (error)
{
    console.error("Error in /api/notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to process notification.", details: errorMessage }, { status: 500 });
  }
}
