
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
      return "bg-secondary border-foreground/30 text-secondary-foreground"; // Using secondary as an orange/amber proxy
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
    if (!times) return { display: 'none' }; // Should not happen if eventsForDate is pre-filtered

    const startHour = times.start.getHours();
    const startMinute = times.start.getMinutes();
    const endHour = times.end.getHours();
    const endMinute = times.end.getMinutes();
    
    // Calculate duration in minutes
    // Handle overnight events correctly for duration calculation if needed, though parseEventTimes handles date advancement for end time.
    let durationInMinutes = ((times.end.getTime() - times.start.getTime()) / (1000 * 60));
    if (durationInMinutes <=0) durationInMinutes = 5; // Min height for very short events

    const top = (startHour * hourRowHeightPx) + (startMinute * pixelsPerMinute);
    const height = durationInMinutes * pixelsPerMinute;
    
    // Basic overlap handling: assign a column
    // This is a very simplified version. Real collision detection is complex.
    // For now, we'll just let them overlap if this isn't sufficient.
    // A more robust solution would calculate max overlaps and divide width.
    const columnIndex = eventsForDate.filter(e => {
        if (e.id === event.id) return false;
        const eTimes = parseEventTimes(e.date, e.time);
        if (!eTimes) return false;
        // Check if e starts before current event ends AND e ends after current event starts
        return eTimes.start < times.end && eTimes.end > times.start;
    }).findIndex(e => e.id === event.id); // This logic for column is not quite right, needs proper overlap grouping

    const numberOfOverlapping = eventsForDate.reduce((acc, otherEvent) => {
        if (otherEvent.id === event.id) return acc;
        const otherTimes = parseEventTimes(otherEvent.date, otherEvent.time);
        if (!otherTimes) return acc;
        if (otherTimes.start < times.end && otherTimes.end > times.start) {
            return acc + 1;
        }
        return acc;
    }, 0) +1; // +1 for the event itself


    // This is a very basic way to stagger overlapping events, not true column layout
    // Count how many other events start at the exact same time to determine an offset.
    const concurrentStartIndex = eventsForDate
      .filter(e => parseEventTimes(e.date, e.time)?.start.getTime() === times.start.getTime())
      .sort((a,b) => a.id.localeCompare(b.id)) // Consistent sort for stable staggering
      .findIndex(e => e.id === event.id);
    
    const widthPercentage = 100 / numberOfOverlapping ; // Example: if 2 overlap, each gets 50%
    const leftPercentage = eventsForDate
        .filter(e => {
            const eTimes = parseEventTimes(e.date, e.time);
            return eTimes && eTimes.start < times.end && eTimes.end > times.start && e.id < event.id;
        })
        .reduce((acc, curr) => acc + (100 / (eventsForDate.filter(ev => {
            const evTimes = parseEventTimes(ev.date, ev.time);
            return evTimes && evTimes.start < parseEventTimes(curr.date, curr.time)!.end && evTimes.end > parseEventTimes(curr.date, curr.time)!.start;
        }).length +1 ) ), 0);


    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 15)}px`, // Minimum height for visibility
      left: `${concurrentStartIndex * (100 / (numberOfOverlapping +1))}%`, // Simple staggering
      width: `${100 / (numberOfOverlapping +1) - 2}%`, // Adjust width based on overlaps, with a small gap
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
                "absolute rounded-md p-2 border transition-all duration-150 ease-in-out shadow-md",
                getPriorityColor(event.priority)
              )}
              title={`${event.name} (${event.time})`}
            >
              <p className="text-xs font-semibold truncate">{event.name}</p>
              <p className="text-xs truncate opacity-80">{event.time}</p>
               {/* <p className="text-[10px] truncate opacity-60">{event.project}</p> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


    