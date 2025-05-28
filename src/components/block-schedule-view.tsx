
"use client";

import type { Event } from "@/app/(app)/events/page";
import { parseEventTimes } from "@/app/(app)/events/page";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Users, Settings, Zap, Eye, Camera as CameraIcon, AlertTriangle } from "lucide-react";
import type { Personnel } from "@/app/(app)/personnel/page";

interface BlockScheduleViewProps {
  selectedDate: Date;
  eventsForDate: Event[];
  personnelForDay: Personnel[];
  onEditEvent?: (event: Event) => void;
  allPersonnel: Personnel[]; // Full list of personnel to get names from IDs
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
  if (discipline === "Photography") return <CameraIcon className="h-3 w-3 opacity-80 flex-shrink-0" />;
  return null;
};


export function BlockScheduleView({ selectedDate, eventsForDate, personnelForDay, onEditEvent, allPersonnel }: BlockScheduleViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i);
  const hourRowHeightPx = HOUR_ROW_HEIGHT_REM * 16;
  const pixelsPerMinute = hourRowHeightPx / 60;

  const getEventBlockStyle = (event: Event): React.CSSProperties | null => {
    const times = parseEventTimes(event.date, event.time);
    if (!times) return null;

    const startOfDayDate = new Date(times.start);
    startOfDayDate.setHours(0,0,0,0);

    const eventStartOffsetMinutes = (times.start.getTime() - startOfDayDate.getTime()) / (1000 * 60);
    let durationInMinutes = ((times.end.getTime() - times.start.getTime()) / (1000 * 60));
    if (durationInMinutes <= 0) durationInMinutes = 15;

    const top = eventStartOffsetMinutes * pixelsPerMinute;
    const height = Math.max(durationInMinutes * pixelsPerMinute, 30);

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${height}px`,
      left: '2%',
      width: '96%',
      zIndex: 10 + Math.floor(eventStartOffsetMinutes / 60),
      overflow: 'hidden',
    };
  };

  if (!eventsForDate || eventsForDate.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground rounded-md min-h-[400px] flex flex-col items-center justify-center bg-muted/20">
        <CalendarIcon className="h-12 w-12 mb-4 text-muted" />
        <p className="text-lg font-medium">No events scheduled for {format(selectedDate, "EEEE, MMMM do, yyyy")}.</p>
      </div>
    );
  }

  const displayPersonnel = personnelForDay.length > 0 ? personnelForDay : [{ id: "general", name: "General / Unassigned" }];

  return (
    <div className="flex flex-col bg-background rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">
          Schedule for: {format(selectedDate, "EEEE, MMMM do, yyyy")}
        </h3>
      </div>

      {/* Header Row for Personnel Names */}
      <div className="flex sticky top-16 bg-background z-20 shadow-sm"> {/* Sticky header row */}
        <div className="w-20 shrink-0 border-b border-r"> {/* Spacer for time gutter */}
          &nbsp;
        </div>
        {displayPersonnel.map((person) => (
          <div
            key={`header-${person.id}`}
            className="flex-1 min-w-[200px] sm:min-w-[250px] border-b border-r last:border-r-0 p-2 text-center font-medium text-sm"
          >
            {person.name}
          </div>
        ))}
      </div>

      {/* Timeline Area */}
      <div className="flex flex-grow overflow-x-auto">
        {/* Time Gutter */}
        <div className="w-20 text-xs text-muted-foreground shrink-0 border-r bg-background z-10"> {/* Ensure bg for time gutter */}
          {hours.map((hour) => (
            <div
              key={`time-${hour}`}
              className="flex items-center justify-end pr-2 border-b"
              style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}
            >
              {`${String(hour).padStart(2, '0')}:00`}
            </div>
          ))}
           <div className="h-1 border-b"></div>
        </div>

        {/* Schedule Columns */}
        <div className="flex flex-grow">
          {displayPersonnel.map((person) => (
            <div
              key={person.id}
              className="flex-1 min-w-[200px] sm:min-w-[250px] border-r last:border-r-0"
            >
              {/* Column Timeline - Events are positioned absolutely within this */}
              <div className="relative">
                  {hours.map((hour) => (
                      <div key={`grid-${person.id}-${hour}`} className="border-b" style={{ height: `${HOUR_ROW_HEIGHT_REM}rem` }}>
                          <div className="border-b border-dashed border-border/30" style={{height: `${HOUR_ROW_HEIGHT_REM / 2}rem`}}></div>
                      </div>
                  ))}
                   <div className="h-1 border-b"></div> {/* Extra border at bottom of timeline */}

                  {eventsForDate
                    .filter(event => person.id === "general" ? !event.assignedPersonnelIds || event.assignedPersonnelIds.length === 0 : event.assignedPersonnelIds?.includes(person.id))
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
                            <button
                              className="absolute top-0.5 right-0.5 h-5 w-5 p-0.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-card/50 hover:bg-card/70 rounded-sm flex items-center justify-center"
                              onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                              aria-label="Edit event"
                            >
                              <Settings className="h-3 w-3" />
                            </button>
                          )}
                          <div>
                            <p className="text-xs font-semibold truncate leading-tight flex items-center gap-1">
                              {getCoverageIcon(event.isCovered)}
                              <span className="truncate">{event.name}</span>
                              {event.isQuickTurnaround && <Zap className="h-3 w-3 text-red-400 flex-shrink-0 ml-0.5" title="Quick Turnaround"/>}
                            </p>
                            <p className="opacity-80 truncate leading-tight">{event.time}</p>
                            <p className="opacity-70 truncate leading-tight">Proj: {event.project?.substring(0,15)}{event.project && event.project.length > 15 ? '...' : ''}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple Calendar Icon for fallback, not imported from lucide if not needed elsewhere to keep component self-contained if possible
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
    

    