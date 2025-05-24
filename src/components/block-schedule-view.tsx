
"use client";

import type { Event } from "@/app/(app)/events/page"; // Assuming Event type is exported
import { parseEventTimes } from "@/app/(app)/events/page"; // Assuming parseEventTimes is exported
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BlockScheduleViewProps {
  selectedDate: Date;
  eventsForDate: Event[];
}

const HOUR_ROW_HEIGHT_REM = 4; // 4rem = 64px if 1rem = 16px
const TOTAL_HOURS = 24;

// Helper to get a color based on priority
const getPriorityColor = (priority: Event['priority']): string => {
  switch (priority) {
    case "Critical":
      return "bg-destructive/80 border-destructive text-destructive-foreground";
    case "High":
      return "bg-secondary border-foreground/30 text-secondary-foreground";
    case "Medium":
      return "bg-primary/70 border-primary text-primary-foreground";
    case "Low":
      return "bg-muted border-foreground/20 text-muted-foreground";
    default:
      return "bg-gray-500 border-gray-700 text-white";
  }
};


export function BlockScheduleView({ selectedDate, eventsForDate }: BlockScheduleViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i); // 0-23

  const hourRowHeightPx = HOUR_ROW_HEIGHT_REM * 16; // Assuming 1rem = 16px
  const pixelsPerMinute = hourRowHeightPx / 60;

  const getEventStyle = (event: Event): React.CSSProperties => {
    const times = parseEventTimes(event.date, event.time);
    if (!times) return { display: 'none' };

    const startHour = times.start.getHours();
    const startMinute = times.start.getMinutes();
    
    let durationInMinutes = ((times.end.getTime() - times.start.getTime()) / (1000 * 60));
    if (durationInMinutes <=0) durationInMinutes = 5; // Min duration for visibility

    const top = (startHour * hourRowHeightPx) + (startMinute * pixelsPerMinute);
    const height = durationInMinutes * pixelsPerMinute;
    
    // This is a very basic way to stagger overlapping events
    const concurrentEvents = eventsForDate.filter(e => {
        if (e.id === event.id) return false;
        const eTimes = parseEventTimes(e.date, e.time);
        if (!eTimes) return false;
        return eTimes.start < times.end && eTimes.end > times.start;
    });

    const numberOfOverlapping = concurrentEvents.length + 1; // +1 for the event itself

    const eventIndexAmongConcurrent = eventsForDate
      .filter(e => {
        const eTimes = parseEventTimes(e.date, e.time);
        return eTimes && eTimes.start < times.end && eTimes.end > times.start;
      })
      .sort((a,b) => (parseEventTimes(a.date, a.time)?.start.getTime() || 0) - (parseEventTimes(b.date, b.time)?.start.getTime() || 0) || a.id.localeCompare(b.id))
      .findIndex(e => e.id === event.id);
      
    const widthPercentage = 98 / numberOfOverlapping; // 98% to leave small gaps
    const leftPercentage = eventIndexAmongConcurrent * (widthPercentage + (2 / numberOfOverlapping));


    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Minimum height for visibility and basic text
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`, 
      zIndex: startMinute + 10, // Basic z-indexing
      overflow: 'hidden',
    };
  };

  return (
    <div className="flex flex-col min-h-[600px] bg-background rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">
          Schedule for: {format(selectedDate, "EEEE, MMMM do, yyyy")}
        </h3>
      </div>
      <div className="flex flex-grow overflow-hidden">
        {/* Hour Labels */}
        <div className="w-20 text-xs text-muted-foreground shrink-0">
          {hours.map((hour) => (
            <div
              key={`time-${hour}`}
              className="flex items-center justify-end pr-2 border-r border-b"
              style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}
            >
              {`${String(hour).padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {/* Timeline Grid & Events */}
        <div className="flex-grow relative overflow-y-auto">
          {/* Background Hour Lines */}
          {hours.map((hour) => (
            <div
              key={`grid-${hour}`}
              className="border-b"
              style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}
            >
              {/* Optional: 30-min line */}
              <div className="border-b border-dashed border-border/50" style={{height: `${HOUR_ROW_HEIGHT_REM / 2}rem`}}></div>
            </div>
          ))}

          {/* Event Blocks */}
          {eventsForDate.map((event) => (
            <div
              key={event.id}
              style={getEventStyle(event)}
              className={cn(
                "absolute rounded-md p-1.5 border transition-all duration-150 ease-in-out shadow-md flex flex-col justify-between", // Added flex for content spacing
                getPriorityColor(event.priority)
              )}
              title={`${event.name} (${event.time}) - Project: ${event.project}`}
            >
              <div>
                <p className="text-xs font-semibold truncate leading-tight">{event.name}</p>
                <p className="text-[10px] truncate opacity-80 leading-tight">{event.time}</p>
              </div>
              <div className="mt-0.5">
                {event.project && <p className="text-[10px] truncate opacity-70 leading-tight">Proj: {event.project}</p>}
                <p className="text-[10px] truncate opacity-70 leading-tight">Contact: J. Doe (Ex.)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
