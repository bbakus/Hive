
"use client";

import type { ReactNode} from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { localUtility } from '../services/localUtility';
import { useToast } from '../hooks/use-toast';

export type AgentConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected';

interface LocalAgentContextType {
  agentConnectionStatus: AgentConnectionStatus;
  isLoadingAgentStatus: boolean;
  verifyAgentConnection: (showToast?: boolean) => Promise<boolean>;
}

const LocalAgentContext = createContext<LocalAgentContextType | undefined>(undefined);

export function LocalAgentProvider({ children }: { children: ReactNode }) {
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<AgentConnectionStatus>('unknown');
  const [isLoadingAgentStatus, setIsLoadingAgentStatus] = useState(true);
  const { toast } = useToast();

  const verifyAgentConnection = useCallback(async (showToast = false): Promise<boolean> => {
    setIsLoadingAgentStatus(true);
    setAgentConnectionStatus('checking');
    try {
      // Attempt to get available drives as a way to ping the agent
      await localUtility.getAvailableDrives(); 
      setAgentConnectionStatus('connected');
      setIsLoadingAgentStatus(false);
      if (showToast) {
        toast({ title: "Local Agent Connected", description: "HIVE can communicate with the local ingestion utility." });
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAgentConnectionStatus('disconnected');
      setIsLoadingAgentStatus(false);
      
      let toastDescription = `Error: ${errorMessage}`;
      if (errorMessage.toLowerCase().includes("failed to fetch") || errorMessage.toLowerCase().includes("networkerror") || errorMessage.toLowerCase().includes("connection refused")) {
        toastDescription = "Could not reach local ingestion utility. Ensure it's running on http://localhost:8765 and allows HIVE's origin (CORS).";
      } else if (errorMessage.includes("status: 404")) {
        toastDescription = "Local utility connected, but a required endpoint (e.g., /available-drives) was not found (404). Check utility API routes.";
      } else if (errorMessage.includes("status:")) {
        toastDescription = `Local utility responded with an error: ${errorMessage}. Check utility logs.`;
      }

      if (showToast) {
        toast({ title: "Local Agent Connection Failed", description: toastDescription, variant: "destructive", duration: 10000 });
      }
      return false;
    }
  }, [toast]);

  useEffect(() => {
    // Perform an initial connection check when the provider mounts
    verifyAgentConnection(false); // No toast on initial silent check
  }, [verifyAgentConnection]);

  return (
    <LocalAgentContext.Provider value={{ agentConnectionStatus, isLoadingAgentStatus, verifyAgentConnection }}>
      {children}
    </LocalAgentContext.Provider>
  );
}

export function useLocalAgentContext() {
  const context = useContext(LocalAgentContext);
  if (context === undefined) {
    throw new Error('useLocalAgentContext must be used within a LocalAgentProvider');
  }
  return context;
}
