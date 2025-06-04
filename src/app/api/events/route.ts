// src/app/api/events/route.ts
import { NextResponse } from 'next/server';

// Define the type for the event data expected from the Python backend
// This should match the structure your Python backend sends
type BackendEvent = {
  id: string;
  name: string;
  date: string; // Assuming 'YYYY-MM-DD'
  location: string | null;
  status: string | null;
  description: string | null;
  shots: any[]; // Define more strictly if possible, e.g., ShotRequestFormData[]
};

export async function GET(request: Request) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000/events';

  try {
    const response = await fetch(pythonBackendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers your Python backend might require, like auth tokens
      },
    });

    if (!response.ok) {
      // Forward the error status and message from the Python backend
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      return NextResponse.json(
        { error: `Failed to fetch events from Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data: { events: BackendEvent[] } = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error fetching from Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service.', details: errorMessage },
        { status: 503 } // Service Unavailable
    );
  }
}

// You can also implement POST for creating events if needed
// export async function POST(request: Request) {
//   const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000/events';
//   try {
//     const body = await request.json();
//     const response = await fetch(pythonBackendUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(body),
//     });

//     if (!response.ok) {
//       const errorBody = await response.text();
//       return NextResponse.json(
//         { error: `Failed to post event to Python backend: ${response.status} ${response.statusText}`, details: errorBody },
//         { status: response.status }
//       );
//     }
//     const data = await response.json();
//     return NextResponse.json(data, { status: response.status });
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : "Unknown error";
//     return NextResponse.json(
//         { error: 'Failed to connect to the Python backend service for POST.', details: errorMessage },
//         { status: 503 }
//     );
//   }
// }
