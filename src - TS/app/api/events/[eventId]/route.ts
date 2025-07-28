// src/app/api/events/[eventId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const eventId = params.eventId;
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || `http://localhost:5001/events/${eventId}`;

  try {
    const response = await fetch(pythonBackendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      return NextResponse.json(
        { error: `Failed to fetch event from Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error fetching from Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service.', details: errorMessage },
        { status: 503 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const eventId = params.eventId;
  const pythonBackendUrl = `http://localhost:5001/events/${eventId}`;

  try {
    const body = await request.json();
    
    // Transform frontend field names to backend field names if needed
    const backendPayload = {
      name: body.name,
      date: body.date,
      time: body.time,
      location: body.location,
      status: body.status,
      description: body.description,
      projectId: body.projectId,
      organizationId: body.organizationId,
      discipline: body.discipline,
      isQuickTurnaround: body.isQuickTurnaround,
      isCovered: body.isCovered,
      deadline: body.deadline
    };

    const response = await fetch(pythonBackendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      return NextResponse.json(
        { error: `Failed to update event in Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error updating event in Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service.', details: errorMessage },
        { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const eventId = params.eventId;
  const pythonBackendUrl = `http://localhost:5001/events/${eventId}`;

  try {
    const response = await fetch(pythonBackendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      return NextResponse.json(
        { error: `Failed to delete event from Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error deleting event from Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service.', details: errorMessage },
        { status: 503 }
    );
  }
} 