
// src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';

interface NotificationPayloadBase {
  userId: string; // ID of user running Ingest, or a system ID
  type: string;   // e.g., "ingest-error", "ingest-warning", "general-info"
  message: string;
  jobId?: string; // Optional, but highly recommended for ingest-related notifications
}

// Example of a more specific payload for ingest errors
interface IngestErrorNotificationPayload extends NotificationPayloadBase {
  type: "ingest-error" | "ingest-warning";
  details?: {
    filePath?: string;
    errorCode?: string;
    sourcePath?: string;
    destinationPath?: string;
    expectedChecksum?: string;
    actualChecksum?: string;
    [key: string]: any; // Other context-specific details
  };
}

export async function POST(request: Request) {
  try {
    // It's good practice to type the expected payload, even if it's generic here.
    const payload: NotificationPayloadBase | IngestErrorNotificationPayload = await request.json();
    
    console.log(`POST /api/notifications received. Type: ${payload.type}, User ID: ${payload.userId}, Job ID: ${payload.jobId || 'N/A'}`);
    if (payload.type === "ingest-error" && (payload as IngestErrorNotificationPayload).details) {
      console.log("Error Details:", (payload as IngestErrorNotificationPayload).details);
    } else {
      console.log("Message:", payload.message);
    }


    // TODO: Implement authentication and authorization
    // TODO: Store this notification (e.g., in a database)
    // TODO: Link to user and/or job if applicable
    // TODO: Potentially trigger real-time updates to connected HIVE clients (e.g., via WebSockets)
    //       so the HIVE UI can display these notifications.

    // For now, just acknowledge receipt
    return NextResponse.json({ ok: true, message: "Notification received by HIVE" });

  } catch (error)
{
    console.error("Error in /api/notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to process notification.", details: errorMessage }, { status: 500 });
  }
}

