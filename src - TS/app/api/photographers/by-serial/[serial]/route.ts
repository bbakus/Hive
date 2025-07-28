// src/app/api/photographers/by-serial/[serial]/route.ts
import { NextResponse } from 'next/server';

// Define the type for personnel data from the Python backend
type BackendPersonnel = {
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

export async function GET(
  request: Request,
  { params }: { params: { serial: string } }
) {
  const cameraSerial = params.serial;
  console.log(`GET /api/photographers/by-serial/${cameraSerial} request received`);

  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001/personnel';

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
        { error: `Failed to fetch personnel from Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const personnel: BackendPersonnel[] = await response.json();
    
    // Filter for photographers only and find by camera serial
    const photographers = personnel.filter(p => 
      p.role.toLowerCase().includes('photographer')
    );
    
    const foundPhotographer = photographers.find(p => 
      p.cameraSerials?.some(s => s.toLowerCase() === cameraSerial.toLowerCase())
    );

    if (foundPhotographer) {
      const photographerInfo = {
        id: foundPhotographer.id,
        name: foundPhotographer.name,
        cameraSerials: foundPhotographer.cameraSerials,
        email: foundPhotographer.email,
        phone: foundPhotographer.phone,
        role: foundPhotographer.role,
        status: foundPhotographer.status
      };
      return NextResponse.json(photographerInfo);
    } else {
      return NextResponse.json({ error: `Photographer not found for serial ${cameraSerial}` }, { status: 404 });
    }

  } catch (error) {
    console.error(`Network or other error fetching from Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service.', details: errorMessage },
        { status: 503 }
    );
  }
}
