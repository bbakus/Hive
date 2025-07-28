
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { usePhaseContext, PHASES, type Phase } from "../contexts/PhaseContext";
import { cn } from "../lib/utils";

export function TopPhaseNavigation() {
  const { activePhase } = usePhaseContext();
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handlePhaseClick = (phase: Phase) => {
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
      case 'View':
        router.push('/galleries');
        break;
      default:
        router.push('/dashboard');
    }
  };

  const baseButtonClass = "uppercase font-semibold tracking-wider !hover:bg-transparent focus-visible:!ring-0 focus-visible:!ring-offset-0 px-2.5 py-1.5 h-auto text-xs sm:text-sm";
  const inactiveStyle = "text-muted-foreground hover:text-foreground";
  const activeStyle = "text-accent";

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
                baseButtonClass,
                mounted && (isActive ? activeStyle : inactiveStyle)
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
