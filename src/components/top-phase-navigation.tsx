
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";

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
          return (
            <Button
              key={phase}
              variant="ghost"
              onClick={() => setActivePhase(phase)}
              className={cn(
                "px-2.5 py-1.5 h-auto sm:px-3",
                "uppercase text-xs sm:text-sm font-semibold tracking-wider",
                // Apply active/inactive styling only after mount to prevent hydration mismatch
                mounted && isActive
                  ? "text-accent"
                  : mounted
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground", // Initial render style for all buttons (server & client initial)
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
