
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page'; 
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay, parseISO, isValid, isBefore, subDays, addDays } from 'date-fns';

export const shotRequestSchemaInternal = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum(["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"]),
  assignedPersonnelId: z.string().optional(),
  notes: z.string().optional(),
  blockedReason: z.string().optional(),
  initialCapturerId: z.string().optional(),
  lastStatusModifierId: z.string().optional(),
  lastStatusModifiedAt: z.string().optional(), 
});

export type ShotRequestFormData = z.infer<typeof shotRequestSchemaInternal>;

export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
};

export type Event = EventTypeDefinition & {
   personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
   organizationId?: string; 
};

const G9E_SUMMIT_PROJECT_ID = "proj_g9e_summit_2024";
const G9E_ORG_ID = "org_g9e";
const SUMMIT_PHOTOGRAPHERS = ["user001", "user002", "user004", "user006"]; // Alice, Bob, Diana, Fiona

const generateDynamicG9eSummitEventsAndShots = (): { events: Event[], shots: ShotRequest[] } => {
  const summitEvents: Event[] = [];
  const summitShots: ShotRequest[] = [];
  let eventIdCounter = 200; 
  let shotIdCounter = 200;
  const today = new Date();

  const summitDays = [
    format(subDays(today, 1), "yyyy-MM-dd"), // Yesterday
    format(today, "yyyy-MM-dd"),             // Today
    format(addDays(today, 1), "yyyy-MM-dd"), // Tomorrow
    format(addDays(today, 2), "yyyy-MM-dd")  // Day after tomorrow
  ];

  const priorities: Event['priority'][] = ["High", "Medium", "Critical", "Low"];
  const disciplines: Event['discipline'][] = ["Photography", "Photography", ""];
  const shotPriorities: ShotRequest['priority'][] = ["High", "Medium", "Critical", "Low"];
  const shotStatuses: ShotRequest['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];


  summitDays.forEach((day, dayIndex) => {
    SUMMIT_PHOTOGRAPHERS.forEach((photographerId, photographerIndex) => {
      const photographerName = `Photographer ${String.fromCharCode(65 + photographerIndex)}`; // P. A, P. B etc.
      
      // Morning Block
      const morningEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter++}`;
      summitEvents.push({
        id: morningEventId,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Morning Coverage`,
        projectId: G9E_SUMMIT_PROJECT_ID,
        project: "G9e Annual Summit 2024",
        date: day,
        time: "09:00 - 12:30",
        priority: priorities[(dayIndex + photographerIndex) % priorities.length],
        assignedPersonnelIds: [photographerId, "user003"], // Assign PM too
        deliverables: 0, 
        shotRequests: 0, // Will be updated
        organizationId: G9E_ORG_ID,
        discipline: disciplines[photographerIndex % disciplines.length],
        isQuickTurnaround: (dayIndex + photographerIndex) % 3 === 0,
        deadline: (dayIndex + photographerIndex) % 3 === 0 ? `${day}T18:00:00Z` : undefined,
        isCovered: true,
        personnelActivity: {},
      });
      for (let i = 0; i < 3; i++) { // 3 shots for morning block
        const shotStatus = shotStatuses[(shotIdCounter + i) % shotStatuses.length];
        summitShots.push({
          id: `sr_summit_${shotIdCounter++}`, eventId: morningEventId,
          description: `Morning Keynote Shot ${i+1} - ${photographerName}`,
          priority: shotPriorities[i % shotPriorities.length], status: shotStatus,
          assignedPersonnelId: photographerId,
          initialCapturerId: (shotStatus === "Captured" || shotStatus === "Completed") ? photographerId : undefined,
          lastStatusModifierId: (shotStatus === "Captured" || shotStatus === "Completed") ? photographerId : (shotStatus === "Blocked" ? "user003" : undefined),
          lastStatusModifiedAt: (shotStatus !== "Unassigned" && shotStatus !== "Assigned") ? subDays(new Date(), photographerIndex).toISOString() : undefined,
          blockedReason: shotStatus === "Blocked" ? "Speaker unavailable" : undefined,
          notes: `Notes for morning shot ${i+1}`
        });
      }

      // Lunch Break
      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_lunch_${eventIdCounter++}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Lunch Break`,
        projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: day,
        time: "12:30 - 13:30", priority: "Low", assignedPersonnelIds: [photographerId],
        deliverables: 0, shotRequests: 0, organizationId: G9E_ORG_ID, discipline: "",
        isCovered: false, personnelActivity: {},
      });

      // Afternoon Block
      const afternoonEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_aft_${eventIdCounter++}`;
      summitEvents.push({
        id: afternoonEventId,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Afternoon Workshops`,
        projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: day,
        time: "13:30 - 17:00", priority: priorities[(dayIndex + photographerIndex + 1) % priorities.length],
        assignedPersonnelIds: [photographerId], deliverables: 0, shotRequests: 0,
        organizationId: G9E_ORG_ID, discipline: disciplines[(photographerIndex + 1) % disciplines.length],
        isCovered: true, personnelActivity: {},
      });
       for (let i = 0; i < 4; i++) { // 4 shots for afternoon
        const shotStatus = shotStatuses[(shotIdCounter + i + 1) % shotStatuses.length];
        summitShots.push({
          id: `sr_summit_${shotIdCounter++}`, eventId: afternoonEventId,
          description: `Afternoon Workshop Shot ${i+1} - ${photographerName}`,
          priority: shotPriorities[(i+1) % shotPriorities.length], status: shotStatus,
          assignedPersonnelId: photographerId,
          initialCapturerId: (shotStatus === "Captured" || shotStatus === "Completed") ? photographerId : undefined,
          lastStatusModifierId: (shotStatus === "Captured" || shotStatus === "Completed") ? photographerId : (shotStatus === "Blocked" ? "user003" : undefined),
          lastStatusModifiedAt: (shotStatus !== "Unassigned" && shotStatus !== "Assigned") ? subDays(new Date(), dayIndex).toISOString() : undefined,
          blockedReason: shotStatus === "Blocked" ? "Access restricted" : undefined,
          notes: `Detailed notes for afternoon shot ${i+1}`
        });
      }

      // Evening Reception (for first two photographers on first two days, alternating for others)
      if ((dayIndex < 2 && photographerIndex < 2) || (dayIndex >=2 && photographerIndex % 2 === dayIndex % 2)) {
        const eveningEventId = `evt_summit_d${dayIndex+1}_p${photographerIndex+1}_eve_${eventIdCounter++}`;
        summitEvents.push({
            id: eveningEventId,
            name: `${photographerName} - Summit Day ${dayIndex+1} Evening Networking`,
            projectId: G9E_SUMMIT_PROJECT_ID, project: "G9e Annual Summit 2024", date: day,
            time: "18:30 - 20:30", priority: "Medium",
            assignedPersonnelIds: [photographerId], deliverables: 0, shotRequests: 0,
            organizationId: G9E_ORG_ID, discipline: "Photography",
            isQuickTurnaround: photographerIndex % 2 === 0,
            isCovered: true, personnelActivity: {},
        });
        for (let i = 0; i < 2; i++) { // 2 shots for evening
            const shotStatus = shotStatuses[(shotIdCounter + i + 2) % shotStatuses.length];
            summitShots.push({
              id: `sr_summit_${shotIdCounter++}`, eventId: eveningEventId,
              description: `Evening Reception Shot ${i+1} - ${photographerName}`,
              priority: shotPriorities[(i+2) % shotPriorities.length], status: shotStatus,
              // No specific assignment, defaults to event personnel
              initialCapturerId: (shotStatus === "Captured" || shotStatus === "Completed") ? SUMMIT_PHOTOGRAPHERS[(i+photographerIndex)%SUMMIT_PHOTOGRAPHERS.length] : undefined,
              lastStatusModifierId: (shotStatus === "Captured" || shotStatus === "Completed") ? SUMMIT_PHOTOGRAPHERS[(i+photographerIndex)%SUMMIT_PHOTOGRAPHERS.length] : undefined,
              lastStatusModifiedAt: (shotStatus !== "Unassigned" && shotStatus !== "Assigned") ? new Date().toISOString() : undefined,
            });
        }
      }
    });
  });

  // Update shotRequests count on events
  summitEvents.forEach(event => {
    event.shotRequests = summitShots.filter(shot => shot.eventId === event.id).length;
  });
  
  return { events: summitEvents, shots: summitShots };
};

type EventContextType = {
  allEvents: Event[];
  eventsForSelectedProjectAndOrg: Event[];
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'>) => void;
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
        const { events: summitEvents, shots: summitShots } = generateDynamicG9eSummitEventsAndShots();
        
        const loadedShotsByEvent: Record<string, ShotRequest[]> = {};
        summitShots.forEach(shot => {
          if (!loadedShotsByEvent[shot.eventId]) {
            loadedShotsByEvent[shot.eventId] = [];
          }
          loadedShotsByEvent[shot.eventId].push(shot);
        });
        
        const finalEvents = summitEvents.map(event => ({
          ...event,
          shotRequests: loadedShotsByEvent[event.id]?.length || 0,
          personnelActivity: event.personnelActivity || {},
        }));

        setAllEventsState(finalEvents);
        setShotRequestsByEventId(loadedShotsByEvent);

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
        discipline: eventData.discipline || "",
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
            if (eventData.discipline !== undefined) updatedEvent.discipline = eventData.discipline;
            if (eventData.isCovered !== undefined) updatedEvent.isCovered = eventData.isCovered;
            updatedEvent.personnelActivity = evt.personnelActivity || {}; 
            if(eventData.personnelActivity) {
                updatedEvent.personnelActivity = {...evt.personnelActivity, ...eventData.personnelActivity};
            }
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
      evt.id === eventId ? { ...evt, shotRequests: (evt.shotRequests || 0) + 1 } : evt
    ));
  }, []);

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
    setShotRequestsByEventId(prev => {
      const eventShots = prev[eventId] || [];
      return {
        ...prev,
        [eventId]: eventShots.filter(shot => shot.id !== shotId),
      };
    });
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: Math.max(0, (evt.shotRequests || 0) - 1) } : evt
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
