
"use client";

import { useLocalAgentContext } from '@/contexts/LocalAgentContext';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Loader2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LocalAgentStatusIndicator() {
  const { agentConnectionStatus, isLoadingAgentStatus, verifyAgentConnection } = useLocalAgentContext();

  let IconComponent = HelpCircle;
  let textColor = "text-muted-foreground";
  let statusText = "Agent: Unknown";
  let tooltipText = "Status of connection to your local ingestion utility.";

  switch (agentConnectionStatus) {
    case 'connected':
      IconComponent = Wifi;
      textColor = "text-green-500 dark:text-green-400";
      statusText = "Agent: Connected";
      tooltipText = "Successfully connected to the local ingestion utility.";
      break;
    case 'disconnected':
      IconComponent = WifiOff;
      textColor = "text-red-500 dark:text-red-400";
      statusText = "Agent: Disconnected";
      tooltipText = "Cannot connect to local ingestion utility. Ensure it's running and accessible.";
      break;
    case 'checking':
      IconComponent = Loader2;
      textColor = "text-yellow-500 dark:text-yellow-400";
      statusText = "Agent: Checking...";
      tooltipText = "Verifying connection to local ingestion utility...";
      break;
    default: // unknown
        tooltipText = "Connection status to local ingestion utility is unknown.";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs">
            <IconComponent className={cn("h-4 w-4", textColor, agentConnectionStatus === 'checking' && "animate-spin")} />
            <span className={cn("hidden md:inline", textColor)}>{statusText}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => verifyAgentConnection(true)}
              className={cn("h-7 w-7 p-1 text-muted-foreground hover:text-foreground", isLoadingAgentStatus && "cursor-not-allowed opacity-50")}
              title="Refresh Connection Status"
              disabled={isLoadingAgentStatus}
              aria-label="Refresh local agent connection status"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", agentConnectionStatus === 'checking' && "animate-spin")} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
