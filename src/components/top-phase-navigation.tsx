
"use client";

import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";
// Icons are no longer needed for phase buttons

export function TopPhaseNavigation() {
  const { activePhase, setActivePhase } = usePhaseContext();

  return (
    <nav className="flex items-center">
      <div className="flex items-center gap-x-1 sm:gap-x-2 md:gap-x-3">
        {PHASES.map((phase) => {
          return (
            <Button
              key={phase}
              variant="ghost"
              onClick={() => setActivePhase(phase)}
              className={cn(
                "px-2.5 py-1.5 h-auto sm:px-3",
                "uppercase text-xs sm:text-sm font-semibold tracking-wider",
                activePhase === phase
                  ? "text-accent" // Active phase text color
                  : "text-muted-foreground hover:text-foreground", // Inactive phase text color and hover color changed to foreground
                "!hover:bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0"
              )}
            >
              <span>{phase}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

