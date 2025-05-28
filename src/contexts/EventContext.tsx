
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page'; // Base type from events page
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay, parseISO, isValid, isBefore, subDays, addDays } from 'date-fns';

// --- Shot Request Definitions ---
export const shotRequestSchemaInternal = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum(["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"]),
  assignedPersonnelId: z.string().optional(),
  notes: z.string().optional(),
  blockedReason: z.string().optional(),
  initialCapturerId: z.string().optional(),
  lastStatusModifierId: z.string().optional(),
  lastStatusModifiedAt: z.string().optional().refine(val => !val || isValid(parseISO(val)), {
    message: "Last status modified must be a valid ISO date string or empty.",
  }),
});
export type ShotRequestFormData = z.infer<typeof shotRequestSchemaInternal>;
export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
};

// --- Event Definition (based on events/page.tsx but used globally now) ---
export type Event = EventTypeDefinition & {
   personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
   organizationId?: string; // Ensure this matches events/page.tsx
   // discipline is already in EventTypeDefinition
};

const G9E_SUMMIT_PROJECT_ID = "proj_g9e_summit_2024";
const G9E_ORG_ID = "org_g9e";
const SUMMIT_PHOTOGRAPHERS = ["user001", "user002", "user004", "user006"];
const OTHER_TEAM_MEMBER_IDS = ["user003", "user005"];

const generateDynamicG9eSummitEventsAndShots = (): { events: Event[], shotsByEventId: Record<string, ShotRequest[]> } => {
  const summitEvents: Event[] = [];
  const shotsByEventId: Record<string, ShotRequest[]> = {};
  let eventIdCounter = 2000;
  let shotIdCounter = 5000;
  const today = new Date();

  const summitDays = [
    format(subDays(today, 1), "yyyy-MM-dd"), // Yesterday
    format(today, "yyyy-MM-dd"),             // Today
    format(addDays(today, 1), "yyyy-MM-dd"), // Tomorrow
    format(addDays(today, 2), "yyyy-MM-dd")  // Day after tomorrow
  ];

  const priorities: Event['priority'][] = ["High", "Medium", "Critical", "Low"];
  const disciplines: Event['discipline'][] = ["Photography", ""]; // Corrected: Only "Photography" or ""
  const shotPriorities: ShotRequest['priority'][] = ["High", "Medium", "Critical", "Low"];
  const shotStatuses: ShotRequest['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];
  const sampleBlockedReasons = ["Access denied", "Talent unavailable", "Equipment malfunction", "Weather issues"];
  const sampleNotes = ["Ensure good lighting", "Focus on candid moments", "Get wide and tight shots", "Check background details"];

  const createShotsForEvent = (eventId: string, eventNamePrefix: string, numShots: number) => {
    if (!shotsByEventId[eventId]) {
      shotsByEventId[eventId] = [];
    }
    for (let i = 0; i < numShots; i++) {
      const shotStatus = shotStatuses[(shotIdCounter + i) % shotStatuses.length];
      let currentInitialCapturerId: string | undefined = undefined;
      let currentLastStatusModifierId: string | undefined = undefined;
      let currentLastStatusModifiedAt: string | undefined = undefined;
      let currentAssignedPersonnelId: string | undefined = undefined;
      let currentBlockedReason: string | undefined = undefined;

      if (shotStatus === "Captured" || shotStatus === "Completed") {
        currentInitialCapturerId = SUMMIT_PHOTOGRAPHERS[(i + eventIdCounter) % SUMMIT_PHOTOGRAPHERS.length];
        currentLastStatusModifierId = currentInitialCapturerId;
        currentLastStatusModifiedAt = subDays(new Date(), (i % 3) + 1).toISOString();
      } else if (shotStatus === "Blocked") {
        currentBlockedReason = sampleBlockedReasons[i % sampleBlockedReasons.length];
        currentLastStatusModifierId = OTHER_TEAM_MEMBER_IDS[i % OTHER_TEAM_MEMBER_IDS.length];
        currentLastStatusModifiedAt = subDays(new Date(), (i % 2)).toISOString();
      } else if (shotStatus === "Request More") {
         currentLastStatusModifierId = OTHER_TEAM_MEMBER_IDS[i % OTHER_TEAM_MEMBER_IDS.length];
         currentLastStatusModifiedAt = subDays(new Date(), (i % 2)).toISOString();
      }
      
      if (shotStatus === "Assigned" || (shotStatus !== "Unassigned" && Math.random() < 0.7) ) { // Assign most non-unassigned shots
          currentAssignedPersonnelId = SUMMIT_PHOTOGRAPHERS[(i+shotIdCounter) % SUMMIT_PHOTOGRAPHERS.length];
      }


      shotsByEventId[eventId].push({
        id: `sr_summit_${shotIdCounter++}`, eventId: eventId,
        description: `${eventNamePrefix} Example Shot ${i+1} - ${currentAssignedPersonnelId ? `for ${currentAssignedPersonnelId.substring(0,7)}` : 'general'}`,
        priority: shotPriorities[(i + eventIdCounter) % shotPriorities.length], status: shotStatus,
        assignedPersonnelId: currentAssignedPersonnelId,
        initialCapturerId: currentInitialCapturerId,
        lastStatusModifierId: currentLastStatusModifierId,
        lastStatusModifiedAt: currentLastStatusModifiedAt,
        blockedReason: currentBlockedReason,
        notes: sampleNotes[i % sampleNotes.length]
      });
    }
  };
  
  summitDays.forEach((day, dayIndex) => {
    SUMMIT_PHOTOGRAPHERS.forEach((photographerId, photographerIndex) => {
      const photographerInfo = { id: photographerId, name: `Photographer ${String.fromCharCode(65 + photographerIndex)}` };
      const sessions = [
        { namePart: "Morning Sessions", time: "09:00 - 12:30", isQuick: (dayIndex + photographerIndex) % 3 === 0, deadlineOffset: 9 }, // 6 PM deadline
        { namePart: "Afternoon Workshops", time: "13:30 - 17:00", isQuick: false, deadlineOffset: 0 }
      ];
      
      // Lunch Break Event (not covered)
      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_lunch_${eventIdCounter++}`,
        name: `${photographerInfo.name} - Lunch Break`,
        projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: day,
        time: "12:30 - 13:30", priority: "Low", assignedPersonnelIds: [photographerInfo.id],
        deliverables: 0, shotRequests: 0, organizationId: G9E_ORG_ID, discipline: "",
        isCovered: false, personnelActivity: {}, isQuickTurnaround: false,
      });

      sessions.forEach((session, sessionIndex) => {
        const eventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_s${sessionIndex}_${eventIdCounter++}`;
        const numShots = Math.floor(Math.random() * (7 - 3 + 1)) + 3; // Random number between 3 and 7

        summitEvents.push({
          id: eventId,
          name: `${photographerInfo.name} - ${session.namePart}`,
          projectId: G9E_SUMMIT_PROJECT_ID,
          project: "G9e Annual Summit 2024",
          date: day,
          time: session.time,
          priority: priorities[(dayIndex + photographerIndex + sessionIndex) % priorities.length],
          assignedPersonnelIds: [photographerInfo.id, "user003"], // Assign current photographer and PM
          deliverables: 0, 
          shotRequests: numShots, 
          organizationId: G9E_ORG_ID,
          discipline: disciplines[(dayIndex + photographerIndex + sessionIndex) % disciplines.length],
          isQuickTurnaround: session.isQuick,
          deadline: session.isQuick ? `${day}T${String(session.deadlineOffset + 9).padStart(2, '0')}:00:00Z` : undefined, // e.g. 18:00 for morning
          isCovered: true,
          personnelActivity: {},
        });
        createShotsForEvent(eventId, session.namePart, numShots);
      });
      
      // Evening Reception (conditional)
      if ((dayIndex < 2 && photographerIndex < 2) || (dayIndex >=2 && photographerIndex % 2 === dayIndex % 2)) {
        const eveningEventId = `evt_summit_d${dayIndex+1}_p${photographerIndex+1}_eve_${eventIdCounter++}`;
        const numEveningShots = Math.floor(Math.random() * (7 - 3 + 1)) + 3;
        summitEvents.push({
            id: eveningEventId,
            name: `${photographerInfo.name} - Evening Networking`,
            projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: day,
            time: "18:30 - 20:30", priority: "Medium",
            assignedPersonnelIds: [photographerInfo.id], deliverables: 0, shotRequests: numEveningShots,
            organizationId: G9E_ORG_ID, discipline: "Photography",
            isQuickTurnaround: photographerIndex % 2 === 0,
            isCovered: true, personnelActivity: {},
            deadline: (photographerIndex % 2 === 0) ? `${format(addDays(parseISO(day), 1), "yyyy-MM-dd")}T10:00:00Z` : undefined,
        });
        createShotsForEvent(eveningEventId, "Evening Networking", numEveningShots);
      }
    });
  });
  
  // Today's specific events for testing /shoot page statuses
  const now = new Date();
  const todayDateStr = format(now, "yyyy-MM-dd");
  const todayEventsToAdd : Event[] = [
    { // Completed
      id: `evt_today_completed_${eventIdCounter++}`, name: "Today's Completed Demo Event",
      projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: todayDateStr,
      time: `${format(subHours(now, 2), "HH:mm")} - ${format(subHours(now, 1), "HH:mm")}`,
      priority: "Medium", assignedPersonnelIds: [SUMMIT_PHOTOGRAPHERS[0]],
      deliverables: 0, shotRequests: 3, organizationId: G9E_ORG_ID, isCovered: true, personnelActivity: {},
      discipline: "Photography", isQuickTurnaround: true, deadline: `${todayDateStr}T${format(addHours(now,2), "HH:mm")}:00Z`
    },
    { // In Progress
      id: `evt_today_inprogress_${eventIdCounter++}`, name: "Today's In-Progress Demo Event",
      projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: todayDateStr,
      time: `${format(subHours(now, 0.5), "HH:mm")} - ${format(addHours(now, 0.5), "HH:mm")}`,
      priority: "High", assignedPersonnelIds: [SUMMIT_PHOTOGRAPHERS[1]],
      deliverables: 0, shotRequests: 4, organizationId: G9E_ORG_ID, isCovered: true, personnelActivity: {},
      discipline: "Photography"
    },
    { // Upcoming
      id: `evt_today_upcoming_${eventIdCounter++}`, name: "Today's Upcoming Demo Event",
      projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: todayDateStr,
      time: `${format(addHours(now, 1), "HH:mm")} - ${format(addHours(now, 2), "HH:mm")}`,
      priority: "Critical", assignedPersonnelIds: [SUMMIT_PHOTOGRAPHERS[2]],
      deliverables: 0, shotRequests: 5, organizationId: G9E_ORG_ID, isCovered: true, personnelActivity: {},
      discipline: ""
    }
  ];
  todayEventsToAdd.forEach(evt => {
    summitEvents.push(evt);
    createShotsForEvent(evt.id, evt.name, evt.shotRequests);
  });

  // Final check to ensure shotRequest counts on events are accurate
  summitEvents.forEach(event => {
    if (event.isCovered) {
      const actualShots = shotsByEventId[event.id]?.length || 0;
      if (event.shotRequests !== actualShots) {
        event.shotRequests = actualShots;
      }
    } else {
        event.shotRequests = 0;
    }
  });
  
  return { events: summitEvents, shotsByEventId: shotsByEventId };
};

type EventContextType = {
  allEvents: Event[];
  eventsForSelectedProjectAndOrg: Event[];
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> & { organizationId: string }) => void;
  updateEvent: (eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => void;
  deleteEvent: (eventId: string) => void;
  isLoadingEvents: boolean;
  getEventById: (eventId: string) => Event | undefined;
  
  shotRequestsByEventId: Record<string, ShotRequest[]>;
  getShotRequestsForEvent: (eventId: string) => ShotRequest[];
  addShotRequest: (eventId: string, shotData: ShotRequestFormData) => void;
  updateShotRequest: (eventId: string, shotId: string, updatedData: Partial<ShotRequestFormData>) => void;
  deleteShotRequest: (eventId: string, shotId: string) => void;

  checkInUserToEvent: (eventId: string, personnelId: string) => void;
  checkOutUserFromEvent: (eventId: string, personnelId: string) => void;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId, projects } = useProjectContext();
  const { selectedOrganizationId } = useOrganizationContext();

  const [allEventsState, setAllEventsState] = useState<Event[]>([]);
  const [shotRequestsByEventId, setShotRequestsByEventId] = useState<Record<string, ShotRequest[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      setIsLoadingEvents(true);
      if (useDemoData) {
        const { events: summitEvents, shotsByEventId: summitShotsByEventId } = generateDynamicG9eSummitEventsAndShots();
        setAllEventsState(summitEvents);
        setShotRequestsByEventId(summitShotsByEventId);
      } else {
        setAllEventsState([]);
        setShotRequestsByEventId({});
      }
      setIsLoadingEvents(false);
    } else {
      setAllEventsState([]);
      setShotRequestsByEventId({});
      setIsLoadingEvents(true);
    }
  }, [useDemoData, isLoadingSettings]);

  const addEvent = useCallback((eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity' | 'organizationId'> & { organizationId: string }) => {
    const projectForEvent = projects.find(p => p.id === eventData.projectId);

    setAllEventsState((prevEvents) => {
      const newEvent: Event = {
        ...eventData,
        id: `evt${String(prevEvents.length + 1 + Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        project: projectForEvent?.name || "Unknown Project",
        deliverables: 0, 
        shotRequests: 0, 
        hasOverlap: false, 
        organizationId: eventData.organizationId || projectForEvent?.organizationId || "",
        discipline: eventData.discipline === "Photography" ? "Photography" : "",
        isCovered: eventData.isCovered === undefined ? true : eventData.isCovered,
        personnelActivity: {},
      };
      return [...prevEvents, newEvent];
    });
  }, [projects]);

  const updateEvent = useCallback((eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => {
    let projectName = eventData.projectId ? projects.find(p => p.id === eventData.projectId)?.name : undefined;
    let orgId = eventData.projectId ? projects.find(p => p.id === eventData.projectId)?.organizationId : undefined;

    setAllEventsState((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId) {
            const updatedEvent = { ...evt, ...eventData };
            if (projectName) updatedEvent.project = projectName;
            if (orgId !== undefined && updatedEvent.organizationId !== orgId) updatedEvent.organizationId = orgId;
            
            if (eventData.discipline !== undefined) {
              updatedEvent.discipline = eventData.discipline === "Photography" ? "Photography" : "";
            }
            if (eventData.isCovered !== undefined) updatedEvent.isCovered = eventData.isCovered;
            
            updatedEvent.personnelActivity = eventData.personnelActivity ? { ...evt.personnelActivity, ...eventData.personnelActivity} : (evt.personnelActivity || {});
            
            return updatedEvent;
        }
        return evt;
      })
    );
  }, [projects]);

  const deleteEvent = useCallback((eventId: string) => {
    setAllEventsState((prevEvents) =>
      prevEvents.filter((evt) => evt.id !== eventId)
    );
    setShotRequestsByEventId(prevShots => {
      const newShots = {...prevShots};
      delete newShots[eventId];
      return newShots;
    });
  }, []);

  const getShotRequestsForEvent = useCallback((eventId: string): ShotRequest[] => {
    return shotRequestsByEventId[eventId] || [];
  }, [shotRequestsByEventId]);

  const addShotRequest = useCallback((eventId: string, shotData: ShotRequestFormData) => {
    const newShot: ShotRequest = {
      ...shotData,
      id: `sr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      eventId: eventId,
      assignedPersonnelId: shotData.assignedPersonnelId || undefined,
      initialCapturerId: shotData.initialCapturerId || undefined,
      lastStatusModifierId: shotData.lastStatusModifierId || undefined,
      lastStatusModifiedAt: shotData.lastStatusModifiedAt || new Date().toISOString(),
    };
    setShotRequestsByEventId(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newShot],
    }));
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: (shotRequestsByEventId[eventId] ? shotRequestsByEventId[eventId].length + 1 : 1) } : evt
    ));
  }, [shotRequestsByEventId]);

  const updateShotRequest = useCallback((eventId: string, shotId: string, updatedData: Partial<ShotRequestFormData>) => {
    setShotRequestsByEventId(prev => {
      const eventShots = prev[eventId] || [];
      const newEventShots = eventShots.map(shot => {
        if (shot.id === shotId) {
          const newShotData = { ...shot, ...updatedData };
          if (newShotData.status !== "Blocked" && newShotData.blockedReason) {
            newShotData.blockedReason = ""; 
          }
          if (newShotData.assignedPersonnelId === "") { 
            newShotData.assignedPersonnelId = undefined;
          }
          return newShotData;
        }
        return shot;
      });
      return { 
        ...prev, 
        [eventId]: newEventShots 
      };
    });
  }, []);

  const deleteShotRequest = useCallback((eventId: string, shotId: string) => {
    let newShotRequestsCount = 0;
    setShotRequestsByEventId(prev => {
      const eventShots = prev[eventId] || [];
      const updatedShots = eventShots.filter(shot => shot.id !== shotId);
      newShotRequestsCount = updatedShots.length;
      if (updatedShots.length === 0 && prev[eventId]) { // If last shot deleted, remove eventId key
        const updatedShotsByEventId = {...prev};
        delete updatedShotsByEventId[eventId];
        return updatedShotsByEventId;
      }
      return {
        ...prev,
        [eventId]: updatedShots,
      };
    });
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: newShotRequestsCount } : evt
    ));
  }, []);

  const checkInUserToEvent = useCallback((eventId: string, personnelId: string) => {
    setAllEventsState(prevEvents => 
      prevEvents.map(event => {
        if (event.id === eventId) {
          const newPersonnelActivity = {
            ...(event.personnelActivity || {}),
            [personnelId]: {
              ...(event.personnelActivity?.[personnelId] || {}),
              checkInTime: new Date().toISOString(),
              checkOutTime: undefined, 
            }
          };
          return { ...event, personnelActivity: newPersonnelActivity };
        }
        return event;
      })
    );
  }, []);

  const checkOutUserFromEvent = useCallback((eventId: string, personnelId: string) => {
    setAllEventsState(prevEvents =>
      prevEvents.map(event => {
        if (event.id === eventId) {
          const currentCheckInTime = event.personnelActivity?.[personnelId]?.checkInTime;
          if (!currentCheckInTime) return event; 

          const newPersonnelActivity = {
            ...(event.personnelActivity || {}),
            [personnelId]: {
              ...event.personnelActivity?.[personnelId],
              checkOutTime: new Date().toISOString(),
            }
          };
          return { ...event, personnelActivity: newPersonnelActivity };
        }
        return event;
      })
    );
  }, []);

  const eventsForSelectedProjectAndOrg = useMemo(() => {
    if (isLoadingEvents || isLoadingSettings) return [];

    let filteredByOrg = allEventsState;
    if (selectedOrganizationId && selectedOrganizationId !== ALL_ORGANIZATIONS_ID) {
      filteredByOrg = allEventsState.filter(event => event.organizationId === selectedOrganizationId);
    }

    if (!selectedProjectId) {
      return filteredByOrg;
    }
    return filteredByOrg.filter(event => event.projectId === selectedProjectId);
  }, [allEventsState, selectedProjectId, selectedOrganizationId, isLoadingEvents, isLoadingSettings]);


  const getEventById = useCallback((eventId: string) => {
    return allEventsState.find(event => event.id === eventId);
  }, [allEventsState]);


  const value = useMemo(() => ({
    allEvents: allEventsState,
    eventsForSelectedProjectAndOrg: eventsForSelectedProjectAndOrg || [],
    addEvent,
    updateEvent,
    deleteEvent,
    isLoadingEvents,
    getEventById,
    shotRequestsByEventId,
    getShotRequestsForEvent,
    addShotRequest,
    updateShotRequest,
    deleteShotRequest,
    checkInUserToEvent,
    checkOutUserFromEvent,
  }), [
      allEventsState, eventsForSelectedProjectAndOrg, addEvent, updateEvent, deleteEvent, isLoadingEvents, getEventById,
      shotRequestsByEventId, getShotRequestsForEvent, addShotRequest, updateShotRequest, deleteShotRequest,
      checkInUserToEvent, checkOutUserFromEvent
    ]);

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
}
