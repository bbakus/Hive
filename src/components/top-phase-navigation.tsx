
"use client";

import * as React from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";

export function TopPhaseNavigation() {
  const { activePhase, setActivePhase } = usePhaseContext();
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter(); // Initialize useRouter

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handlePhaseClick = (phase: Phase) => {
    setActivePhase(phase); // Update the active phase in context

    // Navigate to a default route for the selected phase
    switch (phase) {
      case 'Dashboard':
        router.push('/dashboard');
        break;
      case 'Plan':
        router.push('/projects'); // Default to /projects for Plan
        break;
      case 'Shoot':
        router.push('/events'); // Default to /events for Shoot
        break;
      case 'Edit':
        router.push('/post-production');
        break;
      case 'Deliver':
        router.push('/deliverables');
        break;
      default:
        router.push('/dashboard'); // Fallback, should not be reached if PHASES is correct
    }
  };

  return (
    <nav className="flex items-center">
      <div className="flex items-center gap-x-1 sm:gap-x-2 md:gap-x-3">
        {PHASES.map((phase) => {
          const isActive = activePhase === phase;
          return (
            <Button
              key={phase}
              variant="ghost"
              onClick={() => handlePhaseClick(phase)} // Use the new handler
              className={cn(
                "uppercase font-semibold tracking-wider",
                "!hover:bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0",
                mounted
                  ? [
                      "px-2.5 py-1.5 h-auto sm:px-3",
                      "text-xs sm:text-sm",
                      isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
                    ]
                  : [
                      "px-2.5 py-1.5 h-auto",
                      "text-xs",
                      "text-muted-foreground"
                    ]
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
