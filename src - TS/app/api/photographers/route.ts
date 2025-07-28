
// src/app/api/photographers/route.ts
import { NextResponse } from 'next/server';

// Define the type for photographer data from the Python backend
type BackendPhotographer = {
  id: string;
  personnelId: string;
  name: string;
  role: string;
  status: string;
  avatar: string;
  cameraSerials: string[];
  contact: string;
  phone: string;
  email: string;
};

export async function GET(request: Request) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001/photographers';

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
        { error: `Failed to fetch photographers from Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data: BackendPhotographer[] = await response.json();
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

export async function POST(request: Request) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001/personnel';
  
  try {
    const body = await request.json();
    const response = await fetch(pythonBackendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Failed to create photographer in Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service for POST.', details: errorMessage },
        { status: 503 }
    );
  }
}
