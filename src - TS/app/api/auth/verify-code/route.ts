// src/app/api/auth/verify-code/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001/auth/verify-code';

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
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      
      // Try to parse error as JSON, fallback to text
      let errorData;
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { error: errorBody || 'Code verification failed' };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Network or other error with Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the authentication service.', details: errorMessage },
        { status: 503 }
    );
  }
} 