// src/app/api/personnel/route.ts
import { NextResponse } from 'next/server';
import type { Personnel } from '@/app/(app)/personnel/page'; // Adjust path if needed

const mockPersonnel: Personnel[] = [
  { id: "user001", name: "Alice Wonderland", role: "Photographer", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN12345A" },
  { id: "user002", name: "Bob The Builder", role: "Photographer", status: "Assigned", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN98765E"},
  { id: "user003", name: "Charlie Chaplin", role: "Project Manager", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN67890B" },
  { id: "user004", name: "Diana Prince", role: "Photographer", status: "Available", avatar: "https://placehold.co/40x40.png", cameraSerial: "SN11223F" },
  { id: "user005", name: "Edward Scissorhands", role: "Editor", status: "Assigned", cameraSerial: "SN24680C" },
  { id: "user006", name: "Fiona Gallagher", role: "Photographer", status: "Available", cameraSerial: "SN13579D" },
  { id: "user008", name: "Client Representative", role: "Client", status: "Available" },
];

export async function GET(request: Request) {
  // In a real app, you would:
  // 1. Authenticate the user/service.
  // 2. Fetch personnel from your database, potentially filtered by organization.
  console.log("/api/personnel GET request received");
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return NextResponse.json(mockPersonnel);
}
