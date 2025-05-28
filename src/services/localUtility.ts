// src/services/localUtility.ts

interface IngestJobRequest {
  photographerId: string;
  photographerCameraSerial?: string;
  eventId: string;
  sourcePaths: string[];
  workingPath: string; // Changed from destinationPath to align with UI
  backupPath: string;  // Added for consistency with UI
}

export interface IngestJobStatus { // Exporting for use in component
  jobId: string;
  status: 'pending' | 'processing_files' | 'copying' | 'checksumming' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // Made optional as per example usage
  message?: string;  // Made optional
  filesProcessed?: number; // Made optional
  totalFiles?: number;     // Made optional
  totalSizeMB?: number;    // Made optional
  checksumResult?: 'pending' | 'passed' | 'failed' | 'not_run'; // Made optional
  errors?: string[];       // Made optional
}

class LocalUtilityService {
  private baseUrl = 'http://localhost:8765';

  async getAvailableDrives(): Promise<{ locations: string[] }> {
    const response = await fetch(`${this.baseUrl}/available-drives`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get available drives. Server returned an error.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async startIngest(request: IngestJobRequest): Promise<{ jobId: string, message?: string }> {
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to start ingestion. Server returned an error.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async getJobStatus(jobId: string): Promise<IngestJobStatus> {
    const response = await fetch(`${this.baseUrl}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get job status. Server returned an error.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
}

export const localUtility = new LocalUtilityService();
