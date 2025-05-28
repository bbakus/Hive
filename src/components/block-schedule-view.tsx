
"use client";

import type { Event } from "@/app/(app)/events/page";
import { parseEventTimes, formatDeadline } from "@/app/(app)/events/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Users, Settings, Zap, Eye, Camera as CameraIcon, AlertTriangle } from "lucide-react";

interface BlockScheduleViewProps {
  selectedDate: Date;
  eventsForDate: Event[];
  personnelForDay: { id: string; name: string; }[];
  onEditEvent?: (event: Event) => void;
  allPersonnel: { id: string; name: string; role: string }[]; // To get names for general display
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

const getCoverageIcon = (isCovered?: boolean) => {
  if (isCovered === true) return <Eye className="h-3 w-3 text-accent flex-shrink-0" title="Covered Event" />;
  return <Eye className="h-3 w-3 text-muted-foreground opacity-70 flex-shrink-0" title="Not Covered"/>;
};

const getDisciplineIcon = (discipline?: Event['discipline']) => {
  if (discipline === "Photography") return <CameraIcon className="h-3 w-3 opacity-80" />;
  return null;
};


export function BlockScheduleView({ selectedDate, eventsForDate, personnelForDay, onEditEvent, allPersonnel }: BlockScheduleViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i);
  const hourRowHeightPx = HOUR_ROW_HEIGHT_REM * 16; // Assuming 1rem = 16px
  const pixelsPerMinute = hourRowHeightPx / 60;

  const getEventBlockStyle = (event: Event): React.CSSProperties | null => {
    const times = parseEventTimes(event.date, event.time);
    if (!times) return null;

    const startOfDayDate = new Date(times.start);
    startOfDayDate.setHours(0,0,0,0);

    const eventStartOffsetMinutes = (times.start.getTime() - startOfDayDate.getTime()) / (1000 * 60);
    let durationInMinutes = ((times.end.getTime() - times.start.getTime()) / (1000 * 60));
    if (durationInMinutes <= 0) durationInMinutes = 15; // Minimum 15 min display

    const top = eventStartOffsetMinutes * pixelsPerMinute;
    const height = Math.max(durationInMinutes * pixelsPerMinute, 30); // Min height 30px

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${height}px`,
      left: '2%', 
      width: '96%',
      zIndex: times.start.getMinutes() + 10, // Simple stacking
      overflow: 'hidden',
    };
  };
  
  if (eventsForDate.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground rounded-md min-h-[400px] flex flex-col items-center justify-center bg-muted/20">
        <CalendarIcon className="h-12 w-12 mb-4 text-muted" />
        <p className="text-lg font-medium">No events scheduled for {format(selectedDate, "EEEE, MMMM do, yyyy")}.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-[600px] bg-background rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">
          Schedule for: {format(selectedDate, "EEEE, MMMM do, yyyy")}
        </h3>
        {personnelForDay.length === 0 && eventsForDate.length > 0 && (
           <p className="text-sm text-muted-foreground">Events below are not assigned to specific personnel for this day's view.</p>
        )}
      </div>
      <div className="flex flex-grow overflow-x-auto"> {/* Make this scrollable for many personnel */}
        {/* Time Gutter */}
        <div className="w-20 text-xs text-muted-foreground shrink-0 border-r">
          {hours.map((hour) => (
            <div
              key={`time-${hour}`}
              className="flex items-center justify-end pr-2 border-b"
              style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}
            >
              {`${String(hour).padStart(2, '0')}:00`}
            </div>
          ))}
           <div className="h-1 border-b"></div> {/* Ensure last border line */}
        </div>

        {/* Schedule Area */}
        <div className="flex flex-grow">
          {personnelForDay.length > 0 ? (
            personnelForDay.map((person) => (
              <div 
                key={person.id} 
                className="flex-1 min-w-[200px] sm:min-w-[250px] border-r last:border-r-0 relative"
                style={{ flexBasis: `${100 / Math.max(1,personnelForDay.length)}%` }} // Attempt at equal width
              >
                {/* Column Header */}
                <div className="h-10 flex items-center justify-center p-2 border-b bg-muted/50 sticky top-0 z-20">
                  <p className="font-medium text-sm truncate" title={person.name}>{person.name}</p>
                </div>
                {/* Hour lines for this column */}
                <div className="relative">
                    {hours.map((hour) => (
                        <div key={`grid-${person.id}-${hour}`} className="border-b" style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}>
                            <div className="border-b border-dashed border-border/30" style={{height: `${HOUR_ROW_HEIGHT_REM / 2}rem`}}></div>
                        </div>
                    ))}
                     <div className="h-1 border-b"></div>

                    {/* Events for this person */}
                    {eventsForDate
                      .filter(event => event.assignedPersonnelIds?.includes(person.id))
                      .map((event) => {
                        const style = getEventBlockStyle(event);
                        if (!style) return null;
                        
                        const assignedPersonnelNames = event.assignedPersonnelIds
                            ?.map(pid => allPersonnel.find(p => p.id === pid)?.name)
                            .filter(Boolean)
                            .join(', ') || 'N/A';

                        return (
                          <div
                            key={`${event.id}-col-${person.id}`}
                            style={style}
                            className={cn(
                              "rounded-md p-1.5 border transition-all duration-150 ease-in-out shadow-md flex flex-col justify-between group text-[10px]",
                              getPriorityColor(event.priority),
                              event.isCovered === false && "opacity-60 bg-muted/50 border-muted-foreground/30 hover:opacity-90"
                            )}
                            title={`${event.name} (${event.time}) - Assigned: ${assignedPersonnelNames}`}
                          >
                            {onEditEvent && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 h-5 w-5 p-0.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-card/50 hover:bg-card/70"
                                onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                                aria-label="Edit event"
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                            <div>
                              <p className="text-xs font-semibold truncate leading-tight flex items-center gap-1">
                                {getCoverageIcon(event.isCovered)}
                                {event.name}
                                {event.isQuickTurnaround && <Zap className="h-3 w-3 text-red-400 flex-shrink-0 ml-0.5" title="Quick Turnaround"/>}
                              </p>
                              <p className="opacity-80 truncate leading-tight">{event.time}</p>
                            </div>
                            <div className="mt-0.5 space-y-0.5 text-[9px]">
                                {event.discipline && (
                                    <p className="opacity-70 truncate leading-tight flex items-center gap-0.5">
                                        {getDisciplineIcon(event.discipline)}
                                        {event.discipline}
                                    </p>
                                )}
                                {event.hasOverlap && <p className="text-destructive/80 font-semibold leading-tight flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5"/> Conflict</p>}
                                {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 1 && (
                                  <p className="opacity-70 truncate leading-tight flex items-center gap-0.5" title={`Assigned: ${assignedPersonnelNames}`}>
                                    <Users className="h-2.5 w-2.5 shrink-0" />
                                    Shared ({event.assignedPersonnelIds.length})
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>
            ))
          ) : (
            // Fallback for events with no specific personnel assigned to them (or if personnelForDay is empty)
            <div className="flex-1 min-w-[250px] border-r last:border-r-0 relative">
                <div className="h-10 flex items-center justify-center p-2 border-b bg-muted/50 sticky top-0 z-20">
                  <p className="font-medium text-sm truncate">General / Unassigned</p>
                </div>
                <div className="relative">
                    {hours.map((hour) => (
                        <div key={`grid-general-${hour}`} className="border-b" style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}>
                             <div className="border-b border-dashed border-border/30" style={{height: `${HOUR_ROW_HEIGHT_REM / 2}rem`}}></div>
                        </div>
                    ))}
                    <div className="h-1 border-b"></div>
                    {eventsForDate.map((event) => {
                       const style = getEventBlockStyle(event);
                       if (!style) return null;
                       return (
                        <div key={event.id + "-general"} style={style} 
                             className={cn(
                              "rounded-md p-1.5 border transition-all duration-150 ease-in-out shadow-md flex flex-col justify-between group text-[10px]",
                              getPriorityColor(event.priority),
                               event.isCovered === false && "opacity-60 bg-muted/50 border-muted-foreground/30 hover:opacity-90"
                            )}
                             title={`${event.name} (${event.time})`}
                        >
                           {onEditEvent && (
                              <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 p-0.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-card/50 hover:bg-card/70" onClick={(e) => { e.stopPropagation(); onEditEvent(event); }} aria-label="Edit event">
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                            <div>
                                <p className="text-xs font-semibold truncate leading-tight flex items-center gap-1">
                                    {getCoverageIcon(event.isCovered)}
                                    {event.name}
                                    {event.isQuickTurnaround && <Zap className="h-3 w-3 text-red-400 flex-shrink-0 ml-0.5" title="Quick Turnaround"/>}
                                </p>
                                <p className="opacity-80 truncate leading-tight">{event.time}</p>
                            </div>
                            <div className="mt-0.5 space-y-0.5 text-[9px]">
                                {event.hasOverlap && <p className="text-destructive/80 font-semibold leading-tight flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5"/> Conflict</p>}
                                {event.assignedPersonnelIds && event.assignedPersonnelIds.length > 0 && (
                                    <p className="opacity-70 truncate leading-tight flex items-center gap-0.5" title={`Assigned: ${event.assignedPersonnelIds.map(pid => allPersonnel.find(p => p.id === pid)?.name).filter(Boolean).join(', ')}`}>
                                        <Users className="h-2.5 w-2.5 shrink-0" />
                                        {event.assignedPersonnelIds.length} Assigned
                                    </p>
                                )}
                            </div>
                        </div>
                       );
                    })}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// To avoid undefined error for CalendarIcon when no events.
const CalendarIcon = ({ className, ...props }: React.ComponentProps<typeof Users>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-calendar-days", className)} {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
    <path d="M8 14h.01"/>
    <path d="M12 14h.01"/>
    <path d="M16 14h.01"/>
    <path d="M8 18h.01"/>
    <path d="M12 18h.01"/>
    <path d="M16 18h.01"/>
  </svg>
);
    