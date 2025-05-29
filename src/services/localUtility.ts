
// src/services/localUtility.ts

// Aligned with local agent specifications
interface PhotographerInfo {
  id: string;
  name: string;
  email?: string;
  cameraSerials?: string[];
  preferredRawFormat?: string; // Assuming RawFormat is a string for now
  notes?: string;
}

interface IngestJobRequest {
  photographer: PhotographerInfo;
  photographerCameraSerial?: string; // Actual serial used for THIS job
  eventId: string;
  sourcePaths: string[];
  workingPath: string;
  backupPath: string;
}

export interface IngestJobStatus {
  jobId: string;
  status: 'pending' | 'processing_files' | 'copying' | 'checksumming' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  filesProcessed?: number;
  totalFiles?: number;
  totalSizeMB?: number;
  checksumResult?: 'pending' | 'passed' | 'failed' | 'not_run';
  errors?: string[];
}

interface AvailableDrivesResponse {
    locations: Array<{ path: string; [key: string]: any }>; // To match expected object structure
}

class LocalUtilityService {
  private baseUrl = 'http://localhost:8765'; // Ensure this is correct for your local agent

  // Fetches available drives - mainly for connection testing
  async getAvailableDrives(): Promise<AvailableDrivesResponse> {
    const response = await fetch(`${this.baseUrl}/available-drives`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get available drives from local agent.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json() as AvailableDrivesResponse;
  }

  // Starts an ingestion job via the local agent
  async startIngest(request: IngestJobRequest): Promise<{ jobId: string, message?: string }> {
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to start ingestion job with local agent.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Gets the status of an ongoing ingestion job from the local agent
  async getJobStatus(jobId: string): Promise<IngestJobStatus> {
    const response = await fetch(`${this.baseUrl}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get job status from local agent.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // --- Conceptual Endpoints based on local agent specs (HIVE might use these in advanced scenarios) ---
  // HIVE doesn't directly call these in the current UI flow but they are part of the local agent's defined API.

  // async listPhotographers(): Promise<PhotographerInfo[]> {
  //   const response = await fetch(`${this.baseUrl}/photographers`);
  //   if (!response.ok) throw new Error('Failed to list photographers from local agent');
  //   return await response.json();
  // }

  // async getUnrecognizedSerials(): Promise<string[]> {
  //   const response = await fetch(`${this.baseUrl}/photographers/unrecognized-serials`);
  //   if (!response.ok) throw new Error('Failed to get unrecognized serials from local agent');
  //   return await response.json();
  // }

  // async registerCameraSerial(photographerId: string, serial: string): Promise<any> {
  //   const response = await fetch(`${this.baseUrl}/photographers/${photographerId}/camera-serial`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ serial }), // Assuming the agent expects { "serial": "..." }
  //   });
  //   if (!response.ok) throw new Error('Failed to register camera serial with local agent');
  //   return await response.json();
  // }
}

export const localUtility = new LocalUtilityService();

    