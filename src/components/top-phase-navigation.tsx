
"use client";

import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";
// Icons are no longer needed for phase buttons
// import { ClipboardList, Video, Scissors, PackageCheck } from 'lucide-react';

// phaseIcons map is no longer needed
// const phaseIcons: Record<Phase, React.ElementType> = {
//   "Plan": ClipboardList,
//   "Shoot": Video,
//   "Edit": Scissors,
//   "Deliver": PackageCheck,
// };


export function TopPhaseNavigation() {
  const { activePhase, setActivePhase } = usePhaseContext();

  return (
    // Removed sticky, z-index, background, border, margin, shadow classes
    // The component now relies on the parent header for these.
    <nav className="flex items-center">
      {/* Removed px, h-14, justify-center. Added items-center to the inner div. */}
      {/* Using gap-x for horizontal spacing between buttons */}
      <div className="flex items-center gap-x-1 sm:gap-x-2 md:gap-x-3">
        {PHASES.map((phase) => {
          // Icon is no longer rendered
          // const Icon = phaseIcons[phase]; 
          return (
            <Button
              key={phase}
              variant="ghost" // Base variant, colors overridden by cn()
              onClick={() => setActivePhase(phase)}
              className={cn(
                "px-2.5 py-1.5 h-auto sm:px-3", // Adjusted padding for a tighter look
                "uppercase text-xs sm:text-sm font-semibold tracking-wider", // Styling for text: ALL CAPS, size, weight, letter-spacing
                activePhase === phase
                  ? "text-accent" // Active phase text color
                  : "text-muted-foreground hover:text-accent", // Inactive phase text color and hover color
                "!hover:bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0" // Override hover bg and focus ring for cleaner text nav
              )}
              // size="sm" // size prop might conflict with custom padding, relying on className for sizing
            >
              {/* Icon removed */}
              {/* <Icon className="h-4 w-4 mr-0 sm:mr-2" /> */}
              <span>{phase}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
