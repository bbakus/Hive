
"use client";

import { Button } from "@/components/ui/button";
import { usePhaseContext, PHASES, type Phase } from "@/contexts/PhaseContext";
import { cn } from "@/lib/utils";
import { ClipboardList, Video, Scissors, PackageCheck } from 'lucide-react'; // Using more generic icons for phases

const phaseIcons: Record<Phase, React.ElementType> = {
  "Plan": ClipboardList,
  "Shoot": Video,
  "Edit": Scissors,
  "Deliver": PackageCheck,
};


export function TopPhaseNavigation() {
  const { activePhase, setActivePhase } = usePhaseContext();

  return (
    <nav className="sticky top-16 z-20 bg-background/80 backdrop-blur-md border-b mb-6 shadow-sm">
      <div className="px-4 sm:px-6 md:px-8 h-14 flex items-center justify-center gap-2 sm:gap-4">
        {PHASES.map((phase) => {
          const Icon = phaseIcons[phase];
          return (
            <Button
              key={phase}
              variant={activePhase === phase ? "default" : "ghost"}
              onClick={() => setActivePhase(phase)}
              className={cn(
                "flex-1 sm:flex-none sm:min-w-[120px] justify-center sm:justify-start transition-all duration-150 ease-in-out",
                activePhase === phase ? "shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
              size="sm"
            >
              <Icon className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">{phase}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

// Placeholder icons if you prefer specific ones:
// Video, Scissors, PackageCheck are from lucide-react
// The custom Plan icon below was causing a name collision and is not used.
// The `ClipboardList` icon from lucide-react is used above.
/*
const Plan = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    <path d="M10 9H8"/>
    <path d="M16 13H8"/>
    <path d="M16 17H8"/>
  </svg>
);
*/

