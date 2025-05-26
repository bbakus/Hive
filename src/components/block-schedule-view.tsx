
"use client";

import type { Event } from "@/app/(app)/events/page"; 
import { parseEventTimes } from "@/app/(app)/events/page"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Import Button
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Users, Settings } from "lucide-react"; // Import Users and Settings icon

interface BlockScheduleViewProps {
  selectedDate: Date;
  eventsForDate: Event[];
  onEditEvent?: (event: Event) => void; // New prop for handling edit
}

const HOUR_ROW_HEIGHT_REM = 4; 
const TOTAL_HOURS = 24;

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


export function BlockScheduleView({ selectedDate, eventsForDate, onEditEvent }: BlockScheduleViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i); 

  const hourRowHeightPx = HOUR_ROW_HEIGHT_REM * 16; 
  const pixelsPerMinute = hourRowHeightPx / 60;

  const getEventStyle = (event: Event): React.CSSProperties => {
    const times = parseEventTimes(event.date, event.time);
    if (!times) return { display: 'none' };

    const startHour = times.start.getHours();
    const startMinute = times.start.getMinutes();
    
    let durationInMinutes = ((times.end.getTime() - times.start.getTime()) / (1000 * 60));
    if (durationInMinutes <=0) durationInMinutes = 15; // Min duration for visibility (e.g. 15 mins)

    const top = (startHour * hourRowHeightPx) + (startMinute * pixelsPerMinute);
    const height = durationInMinutes * pixelsPerMinute;
    
    const concurrentEvents = eventsForDate.filter(e => {
        if (e.id === event.id) return false;
        const eTimes = parseEventTimes(e.date, e.time);
        if (!eTimes) return false;
        return eTimes.start < times.end && eTimes.end > times.start;
    });

    const numberOfOverlapping = concurrentEvents.length + 1;

    const eventIndexAmongConcurrent = eventsForDate
      .filter(e => {
        const eTimes = parseEventTimes(e.date, e.time);
        return eTimes && eTimes.start < times.end && eTimes.end > times.start;
      })
      .sort((a,b) => (parseEventTimes(a.date, a.time)?.start.getTime() || 0) - (parseEventTimes(b.date, b.time)?.start.getTime() || 0) || a.id.localeCompare(b.id))
      .findIndex(e => e.id === event.id);
      
    const widthPercentage = 98 / numberOfOverlapping; 
    const leftPercentage = eventIndexAmongConcurrent * (widthPercentage + (2 / numberOfOverlapping));


    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 30)}px`, // Minimum height for visibility and basic text
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`, 
      zIndex: startMinute + 10, 
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
              <div className="border-b border-dashed border-border/50" style={{height: `${HOUR_ROW_HEIGHT_REM / 2}rem`}}></div>
            </div>
          ))}

          {/* Event Blocks */}
          {eventsForDate.map((event) => (
            <div
              key={event.id}
              style={getEventStyle(event)}
              className={cn(
                "absolute rounded-md p-1.5 border transition-all duration-150 ease-in-out shadow-md flex flex-col justify-between group", // Added group for hover state
                getPriorityColor(event.priority)
              )}
              title={`${event.name} (${event.time}) - Project: ${event.project}`}
            >
              {onEditEvent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-6 w-6 p-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-card/50 hover:bg-card/70"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    onEditEvent(event);
                  }}
                  aria-label="Edit event"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
              <div>
                <p className="text-xs font-semibold truncate leading-tight">{event.name}</p>
                <p className="text-[10px] truncate opacity-80 leading-tight">{event.time}</p>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {event.project && <p className="text-[10px] truncate opacity-70 leading-tight">Proj: {event.project}</p>}
                {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 && (
                  <p className="text-[10px] truncate opacity-70 leading-tight flex items-center">
                    <Users className="mr-1 h-3 w-3 shrink-0" />
                    {event.assignedPersonnelIds.length} Assigned
                  </p>
                )}
                <p className="text-[10px] truncate opacity-70 leading-tight">Contact: J. Doe (Ex.)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
