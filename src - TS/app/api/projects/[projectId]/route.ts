// src/app/api/projects/[projectId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || `http://localhost:5001/projects/${params.projectId}`;

  try {
    const response = await fetch(pythonBackendUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      
      let errorData;
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { error: errorBody || 'Failed to fetch project' };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error with Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to project service.', details: errorMessage },
        { status: 503 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || `http://localhost:5001/projects/${params.projectId}`;

  try {
    const body = await request.json();
    
    const response = await fetch(pythonBackendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      
      let errorData;
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { error: errorBody || 'Failed to update project' };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error with Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to project service.', details: errorMessage },
        { status: 503 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { projectId: string } }) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || `http://localhost:5001/projects/${params.projectId}`;

  try {
    const response = await fetch(pythonBackendUrl, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      
      let errorData;
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { error: errorBody || 'Failed to delete project' };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error with Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to project service.', details: errorMessage },
        { status: 503 }
    );
  }
} 