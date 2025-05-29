
// src/services/localUtility.ts

export interface PhotographerInfoForAgent {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    // preferredRawFormat?: RawFormat; // Assuming RawFormat is defined if used
    notes?: string;
}

export interface IngestJobRequest {
    photographer: PhotographerInfoForAgent;
    photographerCameraSerial?: string;     
    eventId: string;
    sourcePaths: string[];
    workingPath: string;
    backupPath?: string; // Made optional
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
  determinedPhotographerId?: string; 
  determinedEventId?: string;      
}

export interface DriveInfo {
  path: string;
  available?: boolean;
  freeSpace?: string;
  totalSpace?: string;
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
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json() as AvailableDrivesResponse;
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
      const errorText = await response.text();
      console.error('LocalUtilityService startIngest error response:', errorText);
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
  

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

  // --- Conceptual Local Agent Endpoints HIVE might use in a more advanced setup ---
  // async listPhotographersFromHIVEAgent(): Promise<PhotographerInfoForAgent[]> {
  //   const response = await fetch(`${this.baseUrl}/photographers`);
  //   // ... error handling ...
  //   return await response.json();
  // }

  // async getUnrecognizedSerialsFromHIVEAgent(): Promise<string[]> {
  //   const response = await fetch(`${this.baseUrl}/photographers/unrecognized-serials`);
  //   // ... error handling ...
  //   return await response.json();
  // }

  // async registerCameraSerialWithHIVEAgent(photographerId: string, serial: string): Promise<any> {
  //   const response = await fetch(`${this.baseUrl}/photographers/${photographerId}/camera-serial`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ serial: serial })
  //   });
  //   // ... error handling ...
  //   return await response.json();
  // }
}

export const localUtility = new LocalUtilityService();
