
// src/app/api/personnel/route.ts
import { NextResponse } from 'next/server';
// Assuming Personnel type is defined elsewhere or we use a generic one here
// For consistency with /api/photographers, let's define a similar structure
interface PersonnelForApi {
  id: string;
  name: string;
  role?: string; // Role might be part of this if it's more general than just photographers
  cameraSerials?: string[];
}

const mockPersonnel: PersonnelForApi[] = [
  { id: "user001", name: "Alice Wonderland", role: "Photographer", cameraSerials: ["SN12345A", "SN12345B"] },
  { id: "user002", name: "Bob The Builder", role: "Photographer", cameraSerials: ["SN98765E"]},
  { id: "user003", name: "Charlie Chaplin", role: "Project Manager" },
  { id: "user004", name: "Diana Prince", role: "Photographer", cameraSerials: ["SN11223F"] },
  { id: "user005", name: "Edward Scissorhands", role: "Editor" },
  { id: "user006", name: "Fiona Gallagher", role: "Photographer", cameraSerials: ["SN13579G"] },
];

export async function GET(request: Request) {
  // TODO: Implement authentication and authorization checks
  // TODO: Fetch personnel from your database, potentially filtered by organization.
  console.log("/api/personnel GET request received");
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return NextResponse.json(mockPersonnel);
}

// POST, PUT, DELETE for personnel would go here if needed for utility management
