
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";
import { ClipboardList, Video, Scissors, PackageCheck } from 'lucide-react'; // Using more generic icons for phases

// This mapping is not used if icons are removed, but kept for context or future use.
const phaseIcons: Record<Phase, React.ElementType> = {
  "Plan": ClipboardList,
  "Shoot": Video,
  "Edit": Scissors,
  "Deliver": PackageCheck,
};

export function TopPhaseNavigation() {
  const { activePhase, setActivePhase } = usePhaseContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="flex items-center">
      <div className="flex items-center gap-x-1 sm:gap-x-2 md:gap-x-3">
        {PHASES.map((phase) => {
          const isActive = activePhase === phase;
          // const Icon = phaseIcons[phase]; // Icon no longer used based on new requirements

          return (
            <Button
              key={phase}
              variant="ghost"
              onClick={() => setActivePhase(phase)}
              // Apply consistent base styles for server and initial client render.
              // Dynamic/responsive styles are applied only after mount.
              className={cn(
                "uppercase font-semibold tracking-wider", // Base typography
                "!hover:bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0", // Base interaction overrides

                // Styles applied only after client-side mounting
                mounted
                  ? [
                      "px-2.5 py-1.5 h-auto sm:px-3", // Responsive padding & height
                      "text-xs sm:text-sm",          // Responsive text size
                      isActive ? "text-accent" : "text-muted-foreground hover:text-foreground" // Active/inactive colors
                    ]
                  : [
                      "px-2.5 py-1.5 h-auto", // Base padding & height for SSR & initial client
                      "text-xs",              // Base text size for SSR & initial client
                      "text-muted-foreground" // Base color for SSR & initial client
                    ]
              )}
            >
              {/* <Icon className="mr-2 h-4 w-4" /> Icon removed based on new requirements */}
              <span>{phase}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
