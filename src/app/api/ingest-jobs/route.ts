// src/app/api/ingest-jobs/route.ts
import { NextResponse } from 'next/server';
import type { IngestJobStatus } from '@/services/localUtility'; // Assuming this type is well-defined

// Mock database of ingestion jobs (in a real app, this would be a database)
let mockIngestJobs: IngestJobStatus[] = [
  {
    jobId: 'job_init_g9e_summit_keynote_alice_001',
    status: 'completed',
    progress: 100,
    message: 'Keynote images for Alice ingested successfully.',
    filesProcessed: 150,
    filesMatchedToEvents: 145,
    filesUnmatched: 5,
    totalFiles: 150,
    totalSizeMB: 2048,
    checksumResult: 'passed',
    errors: [],
    determinedPhotographerId: 'user001',
    determinedEventId: 'evt_summit_d1_alice_morn', // Example Event ID
    reportUrl: '/reports/mock/job_alice_keynote.json',
  },
  {
    jobId: 'job_init_g9e_summit_workshop_bob_002',
    status: 'processing_files',
    progress: 65,
    message: 'Processing workshop photos for Bob...',
    filesProcessed: 80,
    totalFiles: 120,
    determinedPhotographerId: 'user002',
    determinedEventId: 'evt_summit_d1_bob_aft', // Example Event ID
  },
  {
    jobId: 'job_init_g9e_failed_ingest_003',
    status: 'failed',
    progress: 30,
    message: 'Ingestion failed due to source read error.',
    filesProcessed: 10,
    totalFiles: 100,
    errors: ['Source path /mnt/cardXYZ became unavailable.'],
    determinedPhotographerId: 'user004',
    determinedEventId: 'evt_summit_d2_diana_morn',
  }
];

export async function GET(request: Request) {
  // In a real app:
  // 1. Authenticate user
  // 2. Fetch jobs from database, possibly filtered by user/organization
  console.log('GET /api/ingest-jobs called');
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return NextResponse.json(mockIngestJobs);
}

// Placeholder for local utility to POST status updates (which would update mockIngestJobs)
// This would be called by the local utility, not HIVE frontend directly.
export async function POST(request: Request) {
  try {
    const newJobStatus: IngestJobStatus = await request.json();
    console.log('POST /api/ingest-jobs received new status:', newJobStatus);
    
    const existingJobIndex = mockIngestJobs.findIndex(job => job.jobId === newJobStatus.jobId);
    if (existingJobIndex > -1) {
      mockIngestJobs[existingJobIndex] = { ...mockIngestJobs[existingJobIndex], ...newJobStatus };
    } else {
      mockIngestJobs.push(newJobStatus);
    }
    return NextResponse.json({ success: true, message: 'Job status updated in HIVE mock DB.' });
  } catch (error) {
    console.error('Error processing POST /api/ingest-jobs:', error);
    return NextResponse.json({ success: false, message: 'Failed to update job status.' }, { status: 500 });
  }
}
