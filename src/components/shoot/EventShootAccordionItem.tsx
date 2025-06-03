
"use client";

import React from "react"; // Import React for React.memo
import type { Event, ShotRequest } from "@/contexts/EventContext";
import type { Personnel } from "@/app/(app)/personnel/page";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { formatDeadline } from "@/app/(app)/events/page";
import { ListChecks, Zap, LogIn, LogOut, Camera as CameraIcon, AlertTriangle, CheckSquare, User, UserCheck, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EventShootAccordionItemProps {
  event: Event;
  personnelList: Personnel[];
  shotRequests: ShotRequest[];
  getPersonnelNameById: (id?: string) => string;
  onCheckIn: (eventId: string, personnelId: string) => void;
  onCheckOut: (eventId: string, personnelId: string) => void;
  onShotAction: (
    eventId: string,
    shotId: string,
    actionType: "toggleCapture" | "toggleBlock"
  ) => void;
  getEventStatusBadgeInfo: (event: Event) => {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
   getShotProgress: (eventId: string) => {
    captured: number;
    total: number;
  };
  isActive?: boolean; // Added isActive prop
}

export const EventShootAccordionItem = React.memo(function EventShootAccordionItemComponent({
  event,
  personnelList,
  shotRequests,
  getPersonnelNameById,
  onCheckIn,
  onCheckOut,
  onShotAction,
  getEventStatusBadgeInfo,
  getShotProgress,
  isActive, // Destructure isActive prop
}: EventShootAccordionItemProps) {
  const eventStatusBadge = getEventStatusBadgeInfo(event);
  const shotProgress = getShotProgress(event.id);

  return (
    <AccordionItem
      value={event.id}
      key={event.id}
      className={cn(
        "bg-card rounded-none shadow-none hover:shadow-none transition-shadow border",
        isActive ? "border-accent" : "border-border" // Conditional border color
      )}
    >
      <AccordionTrigger className="p-4 hover:no-underline">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2 sm:gap-4">
          <div className="flex-1 text-left">
            <h3 className="text-lg font-semibold flex items-center gap-1.5">
              {event.name}
              {event.isQuickTurnaround && (
                <Zap
                  className="h-5 w-5 text-accent ml-1.5 flex-shrink-0"
                  title="Quick Turnaround"
                />
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Time: {event.time}
              {event.deadline && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  Deadline: {formatDeadline(event.deadline)}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
            {/* Priority Badge Removed */}
            <Badge variant={eventStatusBadge.variant} className="text-xs">
              {eventStatusBadge.label}
            </Badge>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Shots: {shotProgress.captured} / {shotProgress.total}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 border-t">
        {(event.assignedPersonnelIds || []).map((personnelId) => {
          const person = personnelList.find((p) => p.id === personnelId);
          if (!person) return null;
          const activity = event.personnelActivity?.[personnelId];
          const isCheckedIn = !!activity?.checkInTime && !activity?.checkOutTime;
          const hasCheckedOut = !!activity?.checkInTime && !!activity?.checkOutTime;

          return (
            <div
              key={personnelId}
              className="mb-4 p-3 border rounded-none bg-muted/30"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <div className="mb-2 sm:mb-0">
                  <p className="font-semibold text-sm">
                    {person.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({person.role})
                    </span>
                  </p>
                  {person.cameraSerials && person.cameraSerials.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CameraIcon className="h-3 w-3" /> S/N(s):{" "}
                      {person.cameraSerials.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCheckIn(event.id, personnelId)}
                    disabled={isCheckedIn || hasCheckedOut}
                    className="w-full sm:w-auto"
                  >
                    <LogIn className="mr-2 h-4 w-4" /> Check In
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCheckOut(event.id, personnelId)}
                    disabled={!isCheckedIn || hasCheckedOut}
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Check Out
                  </Button>
                </div>
              </div>
              {isCheckedIn && activity?.checkInTime && (
                <Badge variant="secondary" className="text-xs mb-1">
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                  Checked In at {format(parseISO(activity.checkInTime), "p")}
                </Badge>
              )}
              {hasCheckedOut && activity?.checkOutTime && (
                <Badge variant="outline" className="text-xs mb-1">
                  Checked Out at {format(parseISO(activity.checkOutTime), "p")}
                </Badge>
              )}
              {hasCheckedOut && activity?.checkInTime && activity.checkOutTime && (
                <p className="text-xs text-muted-foreground">
                  Activity: {format(parseISO(activity.checkInTime), "p")} -{" "}
                  {format(parseISO(activity.checkOutTime), "p")}
                </p>
              )}
              {!isCheckedIn && !hasCheckedOut && (
                <p className="text-xs text-muted-foreground">
                  Not yet checked in to this event.
                </p>
              )}
            </div>
          );
        })}
        {(!event.assignedPersonnelIds ||
          event.assignedPersonnelIds.length === 0) && (
          <p className="text-sm text-muted-foreground mb-3">
            No personnel assigned to this event for individual check-in/out.
          </p>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Shot Checklist:</h4>
            <Button variant="default" size="sm" asChild>
              <Link href={`/shot-planner?eventId=${event.id}`}>
                <ListChecks className="mr-2 h-4 w-4" /> Full Shot List & Edit
              </Link>
            </Button>
          </div>
          {shotRequests.length > 0 ? (
            <div className="space-y-1.5">
              {shotRequests.map((shot) => (
                <div
                  key={shot.id}
                  className="flex items-center gap-2 sm:gap-3 p-2.5 rounded-none border bg-background/50 hover:bg-muted/50 transition-colors"
                >
                   <Badge
                    variant={
                        shot.status === "Captured" ? "default" :
                        shot.status === "Completed" ? "default" :
                        shot.status === "Unassigned" ? "outline" :
                        shot.status === "Assigned" ? "secondary" :
                        shot.status === "Blocked" ? "destructive" :
                        shot.status === "Request More" ? "destructive" : 
                        "outline"
                    }
                    className="text-xs whitespace-nowrap px-2 py-0.5 w-[120px] justify-center flex-shrink-0"
                    >
                    {shot.status}
                    </Badge>
                  <p
                    className="flex-1 text-sm text-foreground truncate"
                    title={shot.description}
                  >
                    {shot.description}
                  </p>
                  <div className="flex flex-row gap-1.5 items-center flex-shrink-0">
                    <Button
                      variant={cn(
                        "h-auto text-xs px-2 py-1 flex-grow-0",
                        (shot.status === "Captured" ||
                          shot.status === "Completed") &&
                          "bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 dark:text-foreground"
                      )}
                      size="sm"
                      onClick={() =>
                        onShotAction(event.id, shot.id, "toggleCapture")
                      }
                    >
                      {(shot.status === "Captured" ||
                        shot.status === "Completed")
                        ? "Uncapture"
                        : "Capture"}
                    </Button>
                    <Button
                      variant={cn(
                        "h-auto text-xs px-2 py-1 flex-grow-0",
                        shot.status === "Blocked" && "destructive"
                      )}
                      size="sm"
                      onClick={() =>
                        onShotAction(event.id, shot.id, "toggleBlock")
                      }
                    >
                      {shot.status === "Blocked" ? "Unblock" : "Block"}
                    </Button>
                  </div>
                </div>
              ))}
              {shotRequests.find(sr => sr.status === 'Blocked' && sr.blockedReason) && (
                <div className="mt-2 text-xs">
                    {shotRequests.filter(sr => sr.status === 'Blocked' && sr.blockedReason).map(sr => (
                        <p key={`block-reason-${sr.id}`} className="text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            Blocked: "{sr.description.substring(0,20)}..." - {sr.blockedReason}
                        </p>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No shot requests defined for this event.
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});

EventShootAccordionItem.displayName = 'EventShootAccordionItemComponent';
    
