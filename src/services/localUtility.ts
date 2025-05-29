
// src/services/localUtility.ts

// Interface for PhotographerInfo, matching local agent's expectation for job initiation
// HIVE *used* to send this, now it's more for reference of what local agent might need.
export interface PhotographerInfoForAgent {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    notes?: string;
}

// Interface for the job request HIVE *would* send if it were initiating with paths.
// For the current flow (local agent initiates, HIVE monitors), HIVE does not POST this.
export interface IngestJobRequest {
    photographer: PhotographerInfoForAgent;
    photographerCameraSerial?: string;
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
  filesMatchedToEvents?: number;
  filesUnmatched?: number;
  totalFiles?: number;
  totalSizeMB?: number;
  checksumResult?: 'pending' | 'passed' | 'failed' | 'not_run' | 'verified';
  errors?: string[];
  reportUrl?: string;
  determinedPhotographerId?: string; // Added: ID of photographer determined by agent
  determinedEventId?: string;      // Added: ID of event determined by agent
}

interface DriveInfo {
  path: string;
  [key: string]: any;
}
interface AvailableDrivesResponse {
    locations: DriveInfo[];
}

class LocalUtilityService {
  private baseUrl = 'http://localhost:8765';

  async getAvailableDrives(): Promise<AvailableDrivesResponse> {
    const response = await fetch(`${this.baseUrl}/available-drives`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService getAvailableDrives error response:', errorText);
      let errorData = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json() as AvailableDrivesResponse;
  }

  // HIVE frontend no longer calls startIngest directly to initiate with paths.
  // The local agent handles its own job initiation and path selection.
  // This method is kept for reference or if a different workflow is re-introduced.
  /*
  async startIngest(request: IngestJobRequest): Promise<{ jobId: string, message?: string }> {
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService startIngest error response:', errorText);
      const errorData = JSON.parse(errorText || '{}');
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
  */

  async getJobStatus(jobId: string): Promise<IngestJobStatus> {
    if (!jobId || jobId.trim() === "") {
        throw new Error("Job ID cannot be empty when checking status.");
    }
    const response = await fetch(`${this.baseUrl}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LocalUtilityService getJobStatus for ${jobId} error response:`, errorText);
      let errorData = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Conceptual placeholders for other local agent APIs
  /*
  async listPhotographers(): Promise<PhotographerInfoForAgent[]> {
    // GET /photographers
  }

  async getUnrecognizedSerials(): Promise<string[]> {
    // GET /photographers/unrecognized-serials
  }

  async registerCameraSerial(photographerId: string, serial: string): Promise<any> {
    // POST /photographers/:photographerId/camera-serial
  }
  */
}

export const localUtility = new LocalUtilityService();
