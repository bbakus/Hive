// src/app/api/photographers/by-serial/[serial]/route.ts
import { NextResponse } from 'next/server';
import type { Personnel } from '@/app/(app)/personnel/page'; // Assuming Personnel type is similar to PhotographerInfo

// This would typically come from a database or a shared context/service
const mockPersonnelList: Personnel[] = [
  { id: "user001", name: "Alice Wonderland", role: "Photographer", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerials: ["SN12345A", "SNXYZ"] },
  { id: "user002", name: "Bob The Builder", role: "Photographer", status: "Assigned", avatar: "https://placehold.co/40x40.png", cameraSerials: ["SN98765E"] },
  { id: "user004", name: "Diana Prince", role: "Photographer", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerials: ["SN11223F", "SNABC"] },
  { id: "user006", name: "Fiona Gallagher", role: "Photographer", status: "Available", cameraSerials: ["SN13579D", "SN24680G"] },
];

export async function GET(
  request: Request,
  { params }: { params: { serial: string } }
) {
  const cameraSerial = params.serial;
  console.log(`GET /api/photographers/by-serial/${cameraSerial} request received`);

  // TODO: Implement authentication and authorization checks
  // TODO: Fetch photographer from a database based on cameraSerial

  const foundPhotographer = mockPersonnelList.find(p => 
    p.cameraSerials?.some(s => s.toLowerCase() === cameraSerial.toLowerCase())
  );

  if (foundPhotographer) {
    // Map to the PhotographerInfo structure expected by the local utility if different
    const photographerInfo = {
        id: foundPhotographer.id,
        name: foundPhotographer.name,
        cameraSerials: foundPhotographer.cameraSerials,
        // email, preferredRawFormat, notes could be added if available and needed
    };
    return NextResponse.json(photographerInfo);
  } else {
    return NextResponse.json({ error: `Photographer not found for serial ${cameraSerial}` }, { status: 404 });
  }
}
