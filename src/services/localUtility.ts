// src/services/localUtility.ts

export interface PhotographerInfoForAgent {
    id: string;
    name: string;
    email?: string;
    cameraSerials?: string[];
    notes?: string;
}

export interface IngestJobRequest {
    photographer: PhotographerInfoForAgent;
    photographerCameraSerial?: string;     
    eventId: string;
    sourcePaths: string[];
    workingPath: string;
    backupPath?: string; 
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
  // Client-side flag, not part of API contract with local agent
  hiveProcessedCompletion?: boolean; 
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
  private localAgentBaseUrl = 'http://localhost:8765';
  private hiveApiBaseUrl = '/api'; // HIVE's own API routes

  async getAvailableDrivesFromLocalAgent(): Promise<AvailableDrivesResponse> {
    const response = await fetch(`${this.localAgentBaseUrl}/available-drives`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService getAvailableDrivesFromLocalAgent error response:', errorText);
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status} from local agent`);
    }
    return await response.json() as AvailableDrivesResponse;
  }

  // This function would be called by HIVE to get the list of jobs (that local agent has pushed to HIVE's backend)
  async getIngestionJobsFromHIVE(): Promise<IngestJobStatus[]> {
    const response = await fetch(`${this.hiveApiBaseUrl}/ingest-jobs`);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('LocalUtilityService getIngestionJobsFromHIVE error:', errorText);
        throw new Error(`Failed to fetch ingestion jobs from HIVE API: ${response.status}`);
    }
    return await response.json();
  }

  // This function is still relevant if HIVE wants to poll a specific job's LATEST status from the local agent,
  // even if the local agent is also pushing to HIVE's backend. Or it could be deprecated.
  // For now, let's assume HIVE fetches the list from its own backend, and might not need to poll individual jobs on local agent.
  async getJobStatusFromLocalAgent(jobId: string): Promise<IngestJobStatus> {
    if (!jobId || jobId.trim() === "") {
        throw new Error("Job ID cannot be empty when checking status with local agent.");
    }
    const response = await fetch(`${this.localAgentBaseUrl}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LocalUtilityService getJobStatusFromLocalAgent for ${jobId} error response:`, errorText);
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status} from local agent`);
    }
    return await response.json();
  }


  // Conceptual: HIVE might not directly "start" an ingest on the local agent anymore if the local agent has its own UI.
  // However, HIVE might "signal" or pass context if the local agent supports it.
  // For now, this remains as a placeholder for what HIVE *could* send if it were initiating.
  async _conceptual_startIngestOnLocalAgent(request: IngestJobRequest): Promise<{ jobId: string, message?: string }> {
    const response = await fetch(`${this.localAgentBaseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService _conceptual_startIngestOnLocalAgent error response:', errorText);
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error if response is not JSON */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status} from local agent`);
    }
    return await response.json();
  }
  

  // ----- API Calls from Local Agent TO HIVE (These would be called by the local agent) -----
  // HIVE needs API routes to receive these. Example:
  // POST /api/ingest-status (Local agent pushes status updates here)
  // POST /api/ingest-report (Local agent pushes final report here)

  // ----- HIVE API Calls (HIVE Frontend calls its own backend) -----
  // GET /api/photographers/by-serial/{serial} // HIVE frontend calls this.
  // GET /api/events/schedule // HIVE frontend calls this if needed by some UI part.
}

export const localUtility = new LocalUtilityService();
