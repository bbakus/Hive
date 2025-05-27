
"use client";

import * as React from "react";
import { useRouter } from "next/navigation"; 
import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";

export function TopPhaseNavigation() {
  const { activePhase, setActivePhase } = usePhaseContext();
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter(); 

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handlePhaseClick = (phase: Phase) => {
    // setActivePhase(phase); // REMOVED: Let AppLayoutInternal handle phase setting based on route
    
    // Navigate to a default route for the selected phase
    switch (phase) {
      case 'Dashboard':
        router.push('/dashboard');
        break;
      case 'Plan':
        router.push('/projects'); 
        break;
      case 'Shoot':
        router.push('/shoot');
        break;
      case 'Edit':
        router.push('/post-production');
        break;
      case 'Deliver':
        router.push('/deliverables');
        break;
      default:
        router.push('/dashboard'); 
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
              onClick={() => handlePhaseClick(phase)} 
              className={cn(
                "uppercase font-semibold tracking-wider",
                "!hover:bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0",
                "px-2.5 py-1.5 h-auto text-xs sm:text-sm", // Base styles for SSR and initial client render
                mounted && (isActive ? "text-accent" : "text-muted-foreground hover:text-foreground") 
              )}
            >
              <span>{phase.toUpperCase()}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
