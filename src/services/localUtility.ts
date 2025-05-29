
// src/services/localUtility.ts

// Interface for PhotographerInfo, for data HIVE might send or receive.
// This aligns with what the local agent developer specified.
export interface PhotographerInfoForAgent {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    // preferredRawFormat?: RawFormat; // Assuming RawFormat is defined if used
    notes?: string;
}

// Interface for the job request HIVE would send if it were to directly initiate jobs with paths.
// Currently, HIVE's ingestion page assumes the local agent handles path selection.
export interface IngestJobRequest {
    photographer: PhotographerInfoForAgent; // Full photographer info
    photographerCameraSerial?: string;     // Specific camera serial for this job (optional, might be redundant if in photographer.cameraSerials)
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
  filesMatchedToEvents?: number; // Added: Number of files agent specifically matched
  filesUnmatched?: number;      // Added: Number of files processed but not matched
  totalFiles?: number;
  totalSizeMB?: number;
  checksumResult?: 'pending' | 'passed' | 'failed' | 'not_run' | 'verified'; // 'verified' is a possible "pass" state
  errors?: string[];
  reportUrl?: string;             // Added: URL to a detailed report from agent
  determinedPhotographerId?: string; // Added: ID of photographer determined by agent
  determinedEventId?: string;      // Added: ID of event determined by agent
}

export interface DriveInfo { // Changed from simple string to object
  path: string;
  available?: boolean;
  freeSpace?: string;
  totalSpace?: string;
  [key: string]: any; // Allow other properties
}
interface AvailableDrivesResponse {
    locations: DriveInfo[]; // Expecting array of DriveInfo objects
}

class LocalUtilityService {
  private baseUrl = 'http://localhost:8765';

  async getAvailableDrives(): Promise<AvailableDrivesResponse> {
    const response = await fetch(`${this.baseUrl}/available-drives`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService getAvailableDrives error response:', errorText);
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json() as AvailableDrivesResponse;
  }

  // HIVE frontend no longer calls startIngest directly with paths to initiate.
  // The local agent handles its own job initiation and path selection.
  // User enters JobID from agent into HIVE for monitoring.
  // This method could be used if HIVE were to POST to the agent to signal a job start.
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
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Placeholder for new Local Agent API endpoints (HIVE doesn't call these directly yet)
  /*
  async listPhotographersFromAgent(): Promise<PhotographerInfoForAgent[]> {
    const response = await fetch(`${this.baseUrl}/photographers`);
    // ... error handling ...
    return await response.json();
  }

  async getUnrecognizedSerialsFromAgent(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/photographers/unrecognized-serials`);
    // ... error handling ...
    return await response.json();
  }

  async registerCameraSerialWithAgent(photographerId: string, serial: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/photographers/${photographerId}/camera-serial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: serial }) // Assuming agent expects this payload
    });
    // ... error handling ...
    return await response.json();
  }
  */
}

export const localUtility = new LocalUtilityService();
