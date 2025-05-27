
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page'; // Main Event type definition
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay, parseISO, isValid, isBefore } from 'date-fns';

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
  lastStatusModifiedAt: z.string().optional(), // ISO Date String
});

export type ShotRequestFormData = z.infer<typeof shotRequestSchemaInternal>;

export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
};
// --- End Shot Request Definitions ---

// Re-export the main Event type from its definition source if EventContext needs to augment it,
// or ensure this local Event type definition is comprehensive.
export type Event = EventTypeDefinition & {
   personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
};


const g9eSummitPhotographers = ["user001", "user002", "user003", "user004", "user005", "user006"];
const g9eSummitDays = ["2024-08-01", "2024-08-02", "2024-08-03", "2024-08-04"];
const g9eSummitProjectId = "proj_g9e_summit";
const g9eOrgId = "org_g9e";

const initialShotRequestsMock: ShotRequest[] = [
  // evt001 shots (proj001, org_g9e)
  { id: "sr001", eventId: "evt001", description: "Opening wide shot of festival grounds", priority: "High", status: "Assigned", assignedPersonnelId: "user001", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "sr002", eventId: "evt001", description: "Close-up of headline act performance", priority: "Critical", status: "Captured", assignedPersonnelId: "user001", initialCapturerId: "user001", lastStatusModifierId: "user001", lastStatusModifiedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "sr003", eventId: "evt001", description: "Audience reaction shots - various angles", priority: "Medium", status: "Unassigned", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
  // evt002 shots (proj002, org_damion_hamilton)
  { id: "sr004", eventId: "evt002", description: "Speaker on stage - wide and medium", priority: "High", status: "Completed", initialCapturerId: "user003", lastStatusModifierId: "user002", lastStatusModifiedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "sr006", eventId: "evt002", description: "Audience listening during keynote", priority: "Medium", status: "Assigned", assignedPersonnelId: "user007", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
  // evt004 shots (proj001, org_g9e)
  { id: "sr007", eventId: "evt004", description: "Artist portraits - backstage", priority: "Medium", status: "Unassigned", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
  { id: "sr008", eventId: "evt004", description: "Group photo of artists", priority: "Medium", status: "Completed", initialCapturerId: "user004", lastStatusModifierId: "user004", lastStatusModifiedAt: new Date().toISOString() },
  // evt005 shots (proj002, org_damion_hamilton)
  { id: "sr009", eventId: "evt005", description: "Closing remarks - wide angle", priority: "High", status: "Captured", assignedPersonnelId: "user001", initialCapturerId: "user001", lastStatusModifierId: "user001", lastStatusModifiedAt: new Date().toISOString()},
  // evt006 shots (proj001, org_g9e)
  { id: "sr011", eventId: "evt006", description: "Workshop venue ambiance before start", priority: "Medium", status: "Unassigned", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString()},
  { id: "sr012", eventId: "evt006", description: "VIP attendee headshot", priority: "High", status: "Blocked", blockedReason: "Talent was not available at scheduled time.", initialCapturerId: undefined, lastStatusModifierId: "user003", lastStatusModifiedAt: new Date().toISOString()},
  
  // Shots for dynamically created "today" events for proj001 (Summer Fest)
  { id: "sr_today_completed_1_new", eventId: "evt_today_completed_dynamic_new", description: "Morning setup details", priority: "Medium", status: "Completed", initialCapturerId: "user001", lastStatusModifierId: "user001", lastStatusModifiedAt: new Date().toISOString()},
  { id: "sr_today_completed_2_new", eventId: "evt_today_completed_dynamic_new", description: "Early crowd shots", priority: "Low", status: "Completed", initialCapturerId: "user001", lastStatusModifierId: "user001", lastStatusModifiedAt: new Date().toISOString()},
  { id: "sr_today_inprogress_1_new", eventId: "evt_today_inprogress_dynamic_new", description: "Main act - performance shots", priority: "High", status: "Captured", assignedPersonnelId: "user002", initialCapturerId: "user002", lastStatusModifierId: "user002", lastStatusModifiedAt: new Date().toISOString()},
  { id: "sr_today_inprogress_2_new", eventId: "evt_today_inprogress_dynamic_new", description: "Audience interaction during set", priority: "Medium", status: "Assigned", assignedPersonnelId: "user002", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
  { id: "sr_today_inprogress_3_new", eventId: "evt_today_inprogress_dynamic_new", description: "Behind-the-scenes with crew", priority: "Medium", status: "Unassigned", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
  { id: "sr_today_upcoming_1_new", eventId: "evt_today_upcoming_dynamic_new", description: "Vendor stall highlights", priority: "Critical", status: "Assigned", assignedPersonnelId: "user004", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
  { id: "sr_today_upcoming_2_new", eventId: "evt_today_upcoming_dynamic_new", description: "Sponsor banner close-ups", priority: "High", status: "Unassigned", initialCapturerId: undefined, lastStatusModifierId: "user_admin_ops", lastStatusModifiedAt: new Date().toISOString() },
];


const generateG9eSummitEvents = (): Event[] => {
  const summitEvents: Event[] = [];
  let eventIdCounter = 100; // Start from a different range to avoid collision with base events
  const disciplines: Event['discipline'][] = ["Photography", "Photography", ""];

  g9eSummitDays.forEach((day, dayIndex) => {
    g9eSummitPhotographers.forEach((photographerId, photographerIndex) => {
      const photographerName = `Photographer ${String.fromCharCode(65 + photographerIndex)}`;
      const morningEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter}`;
      const afternoonEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_aft_${eventIdCounter + 1}`;
      const eveningEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_eve_${eventIdCounter + 200}`; // Ensure distinct IDs

      const morningDiscipline = disciplines[(dayIndex + photographerIndex) % disciplines.length];
      const afternoonDiscipline = disciplines[(dayIndex + photographerIndex + 1) % disciplines.length];
      const eveningDiscipline = disciplines[(dayIndex + photographerIndex + 2) % disciplines.length];

      summitEvents.push({
        id: morningEventId,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Morning Keynotes`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "09:00 - 12:30",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1, // Placeholder
        shotRequests: 0, // Will be calculated later
        organizationId: g9eOrgId,
        discipline: morningDiscipline,
        isQuickTurnaround: (dayIndex + photographerIndex) % 3 === 0,
        deadline: (dayIndex + photographerIndex) % 3 === 0 ? `${day}T18:00:00Z` : undefined,
        isCovered: true,
        personnelActivity: {},
      });
      eventIdCounter++;

      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_lunch_${eventIdCounter++}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Lunch Break`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "12:30 - 13:30",
        priority: "Low",
        assignedPersonnelIds: [photographerId],
        deliverables: 0,
        shotRequests: 0,
        organizationId: g9eOrgId,
        discipline: "",
        isCovered: false,
        personnelActivity: {},
      });

      summitEvents.push({
        id: afternoonEventId,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Afternoon Breakouts`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "13:30 - 17:00",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1, // Placeholder
        shotRequests: 0, // Will be calculated later
        organizationId: g9eOrgId,
        discipline: afternoonDiscipline,
        isCovered: true,
        personnelActivity: {},
      });
      eventIdCounter++;
      
      if (dayIndex === 0 && photographerIndex < 2) { // Fewer internal meetings
         summitEvents.push({
            id: `evt_summit_internal_prep_${photographerIndex}_${eventIdCounter+100}`,
            name: `Internal Team Sync - Team ${String.fromCharCode(65 + photographerIndex)}`,
            projectId: g9eSummitProjectId,
            project: "G9e Corporate Summit 2024",
            date: day,
            time: "08:00 - 08:45",
            priority: "Medium",
            assignedPersonnelIds: [photographerId, "user003"], 
            deliverables: 0,
            shotRequests: 0,
            organizationId: g9eOrgId,
            discipline: "",
            isCovered: false,
            personnelActivity: {},
        });
      }

      if (photographerIndex % 2 === 0) { // Every other photographer gets evening
        summitEvents.push({
          id: eveningEventId,
          name: `${photographerName} - Summit Day ${dayIndex + 1} Evening Networking`,
          projectId: g9eSummitProjectId,
          project: "G9e Corporate Summit 2024",
          date: day,
          time: "18:30 - 20:30",
          priority: "Medium",
          assignedPersonnelIds: [photographerId],
          deliverables: 0, // Placeholder
          shotRequests: 0, // Will be calculated later
          organizationId: g9eOrgId,
          discipline: eveningDiscipline,
          isQuickTurnaround: (dayIndex + photographerIndex) % 4 === 0,
          isCovered: true,
          personnelActivity: {},
        });
      }
      eventIdCounter++; // Increment outside the if to ensure uniqueness
    });
  });
  return summitEvents;
};


const initialBaseEvents: Event[] = [
    { id: "evt001", name: "Music Festival - Main Stage Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 3, assignedPersonnelIds: ["user001", "user002"], isQuickTurnaround: true, deadline: "2024-07-16T10:00:00Z", organizationId: "org_g9e", discipline: "Photography", isCovered: true, personnelActivity: {} },
    { id: "evt002", name: "Tech Conference Keynote", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 2, assignedPersonnelIds: ["user003", "user007"], deadline: "2024-09-15T12:00:00Z", organizationId: "org_damion_hamilton", discipline: "Photography", isCovered: true, personnelActivity: {} },
    { id: "evt003", name: "Gala Dinner - Client Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: false, personnelActivity: {} },
    { id: "evt004", name: "Festival Artist Portraits", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 2, assignedPersonnelIds: ["user004"], organizationId: "org_g9e", discipline: "Photography", isCovered: true, personnelActivity: {} },
    { id: "evt005", name: "Tech Conference Closing Remarks", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 1, assignedPersonnelIds: ["user001", "user003"], isQuickTurnaround: true, deadline: "2024-09-17T23:59:00Z", organizationId: "org_damion_hamilton", discipline: "Photography", isCovered: true, personnelActivity: {} },
    { id: "evt006", name: "Festival Workshop Photography", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-16", time: "10:00 - 12:00", priority: "Medium", deliverables: 2, shotRequests: 2, assignedPersonnelIds: ["user001", "user005"], organizationId: "org_g9e", discipline: "Photography", isCovered: true, personnelActivity: {}},
];


const getInitialEventsWithDynamicToday = (useDemo: boolean): Event[] => {
  if (!useDemo) return [];
  
  let baseEvents = [...initialBaseEvents, ...generateG9eSummitEvents()];
  
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  // For proj001 (Summer Music Festival), org_g9e
  const dynamicTodayEvents: Event[] = [
    {
      id: "evt_today_completed_dynamic_new", name: "Completed Demo Event (Today)", projectId: "proj001", project: "Summer Music Festival 2024",
      date: todayStr, time: `${format(subHours(now, 2), "HH:mm")} - ${format(subHours(now, 1), "HH:mm")}`, priority: "Medium", deliverables: 1,
      shotRequests: 2, 
      assignedPersonnelIds: ["user001"],
      isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: true, personnelActivity: {},
    },
    {
      id: "evt_today_inprogress_dynamic_new", name: "In Progress Demo Event (Today)", projectId: "proj001", project: "Summer Music Festival 2024",
      date: todayStr, time: `${format(subHours(now, 0.5), "HH:mm")} - ${format(addHours(now, 0.5), "HH:mm")}`, priority: "High", deliverables: 2,
      shotRequests: 3, 
      assignedPersonnelIds: ["user002"],
      isQuickTurnaround: true, deadline: format(addHours(now, 4), "yyyy-MM-dd'T'HH:mm:ssXXX"), organizationId: "org_g9e", discipline: "Photography", isCovered: true, personnelActivity: {},
    },
    {
      id: "evt_today_upcoming_dynamic_new", name: "Upcoming Demo Event (Today)", projectId: "proj001", project: "Summer Music Festival 2024",
      date: todayStr, time: `${format(addHours(now, 1), "HH:mm")} - ${format(addHours(now, 2), "HH:mm")}`, priority: "Critical", deliverables: 0,
      shotRequests: 2, 
      assignedPersonnelIds: ["user004"],
      isQuickTurnaround: true, deadline: format(addHours(now, 6), "yyyy-MM-dd'T'HH:mm:ssXXX"), organizationId: "org_g9e", discipline: "Photography", isCovered: true, personnelActivity: {},
    }
  ];

  let combinedEvents = [...baseEvents, ...dynamicTodayEvents];
  
  combinedEvents = combinedEvents.map(event => ({
    ...event,
    shotRequests: initialShotRequestsMock.filter(sr => sr.eventId === event.id).length,
  }));

  return combinedEvents;
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
      let loadedEvents = getInitialEventsWithDynamicToday(useDemoData);
      const loadedShotsByEvent: Record<string, ShotRequest[]> = {};
      
      if (useDemoData) {
        initialShotRequestsMock.forEach(shot => {
          const cleanShot = { ...shot };
          if (!loadedShotsByEvent[shot.eventId]) {
            loadedShotsByEvent[shot.eventId] = [];
          }
          loadedShotsByEvent[shot.eventId].push(cleanShot);
        });
      }
      
      loadedEvents = loadedEvents.map(event => ({
        ...event,
        shotRequests: loadedShotsByEvent[event.id]?.length || 0,
        personnelActivity: event.personnelActivity || {}, // Ensure personnelActivity is initialized
      }));
      
      setAllEventsState(loadedEvents);
      setShotRequestsByEventId(loadedShotsByEvent);
      setIsLoadingEvents(false);
    } else {
      setAllEventsState([]);
      setShotRequestsByEventId({});
      setIsLoadingEvents(true);
    }
  }, [useDemoData, isLoadingSettings]);

  const addEvent = useCallback((eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'>) => {
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
        personnelActivity: {}, // Initialize with empty object
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
            if (orgId !== undefined) updatedEvent.organizationId = orgId;
            if (eventData.discipline !== undefined) updatedEvent.discipline = eventData.discipline;
            if (eventData.isCovered !== undefined) updatedEvent.isCovered = eventData.isCovered;
            // Ensure personnelActivity is preserved or initialized
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
              checkOutTime: undefined, // Clear any previous checkout
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
          if (!currentCheckInTime) return event; // Should not happen if logic is correct

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
