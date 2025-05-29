// src/services/localUtility.ts

// Interface for PhotographerInfo, matching local agent's expectation
export interface PhotographerInfoForAgent { 
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    notes?: string;
}

// Interface for the job request HIVE will NOT directly send anymore,
// but useful for defining what local agent might expect if HIVE did.
// For the current flow, HIVE does not POST to /ingest.
export interface IngestJobRequest {
    photographer: PhotographerInfoForAgent; 
    photographerCameraSerial?: string;
    eventId: string;
    sourcePaths: string[]; // Paths from local agent's UI
    workingPath: string;   // Path from local agent's UI
    backupPath: string;    // Path from local agent's UI
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
  checksumResult?: 'pending' | 'passed' | 'failed' | 'not_run' | 'verified'; // Added 'verified'
  errors?: string[];
  reportUrl?: string; 
}

interface AvailableDrive {
  path: string;
  available?: boolean;
  freeSpace?: string;
  totalSpace?: string;
  [key: string]: any;
}
interface AvailableDrivesResponse {
    locations: AvailableDrive[];
}

class LocalUtilityService {
  private baseUrl = 'http://localhost:8765'; // Standard port for local agent

  async getAvailableDrives(): Promise<AvailableDrivesResponse> {
    const response = await fetch(`${this.baseUrl}/available-drives`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService getAvailableDrives error response:', errorText);
      const errorData = JSON.parse(errorText || '{}'); // Safely parse
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json() as AvailableDrivesResponse;
  }

  // This method is NOT directly called by HIVE in the current primary workflow
  // where user enters Job ID. Kept for potential future direct initiation.
  // async startIngest(request: IngestJobRequest): Promise<{ jobId: string, message?: string }> {
  //   const response = await fetch(`${this.baseUrl}/ingest`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(request),
  //   });
  //   if (!response.ok) {
  //     const errorText = await response.text();
  //     console.error('LocalUtilityService startIngest error response:', errorText);
  //     const errorData = JSON.parse(errorText || '{}');
  //     throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  //   }
  //   return await response.json();
  // }

  async getJobStatus(jobId: string): Promise<IngestJobStatus> {
    if (!jobId || jobId.trim() === "") {
        throw new Error("Job ID cannot be empty when checking status.");
    }
    const response = await fetch(`${this.baseUrl}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LocalUtilityService getJobStatus for ${jobId} error response:`, errorText);
      const errorData = JSON.parse(errorText || '{}');
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // --- Conceptual Endpoints the Local Utility *Exposes* (HIVE doesn't call these directly yet) ---
  // These are based on the utility developer's summary.
  // HIVE's interaction model for these would need further design if HIVE were to manage photographers in the agent.

  // async listPhotographers(): Promise<PhotographerInfoForAgent[]> {
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
  //     body: JSON.stringify({ serial }),
  //   });
  //   if (!response.ok) throw new Error('Failed to register camera serial with local agent');
  //   return await response.json();
  // }
}

export const localUtility = new LocalUtilityService();
