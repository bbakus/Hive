
// src/app/api/photographers/route.ts
import { NextResponse } from 'next/server';

// Mock data for photographers - in a real app, this would come from a database
const mockPhotographers = [
  { id: "user001", name: "Alice Wonderland", cameraSerials: ["SN12345A", "SN12345B"] },
  { id: "user002", name: "Bob The Builder", cameraSerials: ["SN98765E"] },
  { id: "user004", name: "Diana Prince", cameraSerials: ["SN11223F"] },
  { id: "user006", name: "Fiona Gallagher", cameraSerials: ["SN13579G"] },
];

export async function GET(request: Request) {
  // TODO: Implement authentication and authorization
  console.log("GET /api/photographers request received");
  await new Promise(resolve => setTimeout(resolve, 100));
  return NextResponse.json(mockPhotographers);
}

export async function POST(request: Request) {
  try {
    const { name, cameraSerials } = await request.json();
    console.log(`POST /api/photographers - Name: ${name}, Serials: ${cameraSerials?.join(', ')}`);

    // TODO: Implement authentication and authorization
    // TODO: Add new photographer to the database
    
    // For now, return a mock response
    const newPhotographerId = `user_new_${Math.random().toString(36).substring(7)}`;
    const newPhotographer = { id: newPhotographerId, name, cameraSerials };
    // mockPhotographers.push(newPhotographer); // In a real DB, you'd insert

    return NextResponse.json(newPhotographer, { status: 201 });

  } catch (error) {
    console.error("Error in POST /api/photographers:", error);
    return NextResponse.json({ error: "Failed to create photographer." }, { status: 500 });
  }
}
