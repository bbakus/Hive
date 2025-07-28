
// src/services/localUtility.ts

// Interface for the data HIVE sends TO the local agent to start a job
export interface IngestJobRequest {
  photographerId: string;
  eventId: string;
  sourcePaths: string[];
  workingPath: string;
  backupPath: string;
  // photographerCameraSerial could be added if the agent needs it explicitly
  // For now, agent can lookup photographer by ID from HIVE API and get serials
}

// Interface for the data HIVE expects FROM the local agent's /ingest-status endpoint
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
  determinedPhotographerId?: string; // Agent determines this
  determinedEventId?: string;      // Agent determines this
  hiveProcessedCompletion?: boolean; // Client-side flag
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

  async getAvailableDrives(): Promise<AvailableDrivesResponse> {
    const response = await fetch(`${this.localAgentBaseUrl}/available-drives`);
    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status} from local agent`);
    }
    return await response.json() as AvailableDrivesResponse;
  }

  // HIVE calls this to START a job on the local agent
  async startIngest(request: IngestJobRequest): Promise<{ jobId: string; message?: string }> {
    const response = await fetch(`${this.localAgentBaseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status} from local agent`);
    }
    return await response.json();
  }

  // HIVE calls this to GET STATUS of a job from the local agent
  async getJobStatus(jobId: string): Promise<IngestJobStatus> {
    if (!jobId || jobId.trim() === "") {
      throw new Error("Job ID cannot be empty when checking status with local agent.");
    }
    const response = await fetch(`${this.localAgentBaseUrl}/ingest-status/${jobId}`);
    if (!response.ok) {
      const errorText = await response.text();
      let errorData: { error?: string } = { error: `HTTP error! status: ${response.status}` };
      try {
        errorData = JSON.parse(errorText || '{}');
      } catch (e) { /* ignore parsing error */ }
      throw new Error(errorData.error || `HTTP error! status: ${response.status} from local agent`);
    }
    return await response.json();
  }

  // HIVE calls its OWN backend to get a list of jobs (populated by agent POSTs)
  async getIngestionJobsFromHIVE(): Promise<IngestJobStatus[]> {
    const response = await fetch(`${this.hiveApiBaseUrl}/ingest-jobs`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LocalUtilityService getIngestionJobsFromHIVE error:', errorText);
      throw new Error(`Failed to fetch ingestion jobs from HIVE API: ${response.status}`);
    }
    return await response.json();
  }

  /* Placeholder API endpoints for the local agent to call HIVE's backend
     These would be implemented by HIVE's backend (e.g. Next.js API Routes)

  async HIVE_getPhotographers(): Promise<any[]> {
    // const response = await fetch(`${this.hiveApiBaseUrl}/photographers`);
    // return response.json();
    return [];
  }

  async HIVE_getPhotographerBySerial(serial: string): Promise<any | null> {
    // const response = await fetch(`${this.hiveApiBaseUrl}/photographers/by-serial/${serial}`);
    // if (response.ok) return response.json();
    return null;
  }

  async HIVE_getEventsForProject(projectId: string): Promise<any[]> {
    // const response = await fetch(`${this.hiveApiBaseUrl}/projects/${projectId}/events`);
    // return response.json();
    return [];
  }

  async HIVE_postIngestStatus(statusUpdate: IngestJobStatus): Promise<void> {
    // await fetch(`${this.hiveApiBaseUrl}/ingest-status`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(statusUpdate),
    // });
  }
  */
}

export const localUtility = new LocalUtilityService();
