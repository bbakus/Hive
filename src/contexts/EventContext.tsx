
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page';
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay, parseISO, isValid, isBefore } from 'date-fns';

// --- Shot Request Definitions ---
export const shotRequestSchemaInternal = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum(["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"]),
  notes: z.string().optional(),
  blockedReason: z.string().optional(),
});
export type ShotRequestFormData = z.infer<typeof shotRequestSchemaInternal>;
export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
};
// --- End Shot Request Definitions ---

export type Event = EventTypeDefinition;


const initialShotRequestsMock: Omit<ShotRequest, 'id' | 'eventId'>[] = [
  { description: "Opening wide shot of festival grounds, as gates open", priority: "High", status: "Unassigned", notes: "Get this as gates open" },
  { description: "Close-up of headline act performance, key moments", priority: "Critical", status: "Assigned" },
  { description: "Audience reaction shots - various angles, B-Roll style", priority: "Medium", status: "Unassigned" },
  { description: "Speaker on stage - wide and medium compositions", priority: "High", status: "Captured" },
  { description: "Keynote speaker - wide shot capturing stage and audience", priority: "High", status: "Unassigned" },
  { description: "Audience listening during keynote - medium shots", priority: "Medium", status: "Assigned" },
  { description: "Workshop interaction shots - candid B-Roll", priority: "Medium", status: "Unassigned" },
  { description: "Group photo after session, well-lit portrait style", priority: "Medium", status: "Completed"},
  { description: "Action shot of product demo, focus on product features", priority: "High", status: "Captured"},
  { description: "Behind the scenes setup, B-Roll documentation", priority: "Low", status: "Unassigned"},
  { description: "Venue ambiance shots before event, wide establishing shots", priority: "Medium", status: "Unassigned"},
  { description: "Specific requested portrait of VIP - talent unavailable", priority: "High", status: "Blocked", blockedReason: "Talent was not available at scheduled time."},
  { description: "Crowd surfing shot - Today's Early Shoot", priority: "High", status: "Unassigned"},
  { description: "Band leaving stage, B-Roll - Today's Early Shoot", priority: "Medium", status: "Unassigned"},
  { description: "Detailed product close-up - Today's Late Session", priority: "Critical", status: "Assigned"},
  { description: "Wide shot of empty venue after event - Today's Late Session", priority: "Low", status: "Captured"},
  { description: "Dynamic shot of speaker using product - In Progress Demo", priority: "High", status: "Assigned" },
  { description: "Candid interactions at networking booth - In Progress Demo", priority: "Medium", status: "Unassigned" },
  { description: "Venue exteriors and branding - Upcoming Demo", priority: "Medium", status: "Unassigned" },
  { description: "Guest arrival shots - Upcoming Demo", priority: "High", status: "Unassigned" },
  { description: "Final team photo - Completed Demo", priority: "Medium", status: "Completed" },
];

// Helper to add unique IDs and eventId to mock shots
const mapInitialShotsToEvents = (events: Event[], shotsData: Omit<ShotRequest, 'id' | 'eventId'>[]): ShotRequest[] => {
  const result: ShotRequest[] = [];
  let shotCounter = 1;
  
  const eventIds = events.map(e => e.id);
  
  // Assign some generic shots to some events
  const shotsToAssign = [...shotsData]; // Clone to avoid modifying original

  eventIds.forEach((eventId, index) => {
    // Assign a few shots to some events for demo purposes
    if ((index % 3 === 0 || eventId.includes("_test")) && shotsToAssign.length > 0) {
      const numShotsForEvent = (eventId.includes("_test")) ? 2 : Math.min(shotsToAssign.length, (index % 2) + 2); // Assign 1 or 2 shots
      for (let i = 0; i < numShotsForEvent; i++) {
        if (shotsToAssign.length === 0) break;
        const shotBase = shotsToAssign.shift();
        if (shotBase) {
             result.push({
                ...shotBase,
                id: `sr${String(shotCounter++).padStart(3, '0')}`,
                eventId: eventId,
            });
        }
      }
    }
  });
  return result;
};


type EventContextType = {
  allEvents: Event[];
  eventsForSelectedProjectAndOrg: Event[];
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap'>) => void;
  updateEvent: (eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => void;
  deleteEvent: (eventId: string) => void;
  isLoadingEvents: boolean;
  getEventById: (eventId: string) => Event | undefined;
  shotRequestsByEventId: Record<string, ShotRequest[]>;
  getShotRequestsForEvent: (eventId: string) => ShotRequest[];
  addShotRequest: (eventId: string, shotData: ShotRequestFormData) => void;
  updateShotRequest: (eventId: string, shotId: string, updatedData: Partial<ShotRequestFormData>) => void;
  deleteShotRequest: (eventId: string, shotId: string) => void;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

const g9eSummitPhotographers = ["user001", "user002", "user003", "user004", "user005", "user006"];
const g9eSummitDays = ["2024-08-01", "2024-08-02", "2024-08-03", "2024-08-04"];
const g9eSummitProjectId = "proj_g9e_summit";
const g9eOrgId = "org_g9e";

const generateG9eSummitEvents = (): Event[] => {
  const summitEvents: Event[] = [];
  let eventIdCounter = 100;
  const disciplines: Event['discipline'][] = ["Photography", "Photography", ""]; 

  g9eSummitDays.forEach((day, dayIndex) => {
    g9eSummitPhotographers.forEach((photographerId, photographerIndex) => {
      const photographerName = `Photographer ${String.fromCharCode(65 + photographerIndex)}`;
      const morningDiscipline = disciplines[(dayIndex + photographerIndex) % disciplines.length];
      const afternoonDiscipline = disciplines[(dayIndex + photographerIndex + 1) % disciplines.length];
      const eveningDiscipline = disciplines[(dayIndex + photographerIndex + 2) % disciplines.length];

      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Morning Keynotes`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "09:00 - 12:30",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1,
        shotRequests: 0, // Will be calculated later
        organizationId: g9eOrgId,
        discipline: morningDiscipline,
        isQuickTurnaround: (dayIndex + photographerIndex) % 3 === 0,
        deadline: (dayIndex + photographerIndex) % 3 === 0 ? `${day}T18:00:00` : undefined,
        isCovered: true,
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
      });

      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_aft_${eventIdCounter}`, 
        name: `${photographerName} - Summit Day ${dayIndex + 1} Afternoon Breakouts`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "13:30 - 17:00",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1,
        shotRequests: 0, // Will be calculated later
        organizationId: g9eOrgId,
        discipline: afternoonDiscipline,
        isCovered: true,
      });
      
      if (dayIndex === 0 && photographerIndex < 2) {
         summitEvents.push({
            id: `evt_summit_internal_prep_${photographerIndex}_${eventIdCounter+100}`, // Ensure unique ID
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
        });
      }

      if (photographerIndex % 2 === 0) {
        summitEvents.push({
          id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_eve_${eventIdCounter + 200}`,  // Ensure unique ID
          name: `${photographerName} - Summit Day ${dayIndex + 1} Networking Dinner`,
          projectId: g9eSummitProjectId,
          project: "G9e Corporate Summit 2024",
          date: day,
          time: "18:30 - 20:30",
          priority: "Medium",
          assignedPersonnelIds: [photographerId],
          deliverables: 0,
          shotRequests: 0, // Will be calculated later
          organizationId: g9eOrgId,
          discipline: eveningDiscipline,
          isQuickTurnaround: (dayIndex + photographerIndex) % 4 === 0,
          isCovered: true,
        });
      }
      eventIdCounter++; 
    });
  });
  return summitEvents;
};

const initialMockEventsRaw: Event[] = [
    { id: "evt001", name: "Music Festival - Main Stage Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 0, assignedPersonnelIds: ["user001", "user002"], isQuickTurnaround: true, deadline: "2024-07-16T10:00:00", organizationId: "org_g9e", discipline: "Photography", isCovered: true },
    { id: "evt002", name: "Tech Conference Keynote", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 0, assignedPersonnelIds: ["user003", "user007"], deadline: "2024-09-15T12:00:00", organizationId: "org_damion_hamilton", discipline: "Photography", isCovered: true },
    { id: "evt003", name: "Gala Dinner - Client Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: false },
    { id: "evt004", name: "Festival Artist Portraits", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: ["user004"], organizationId: "org_g9e", discipline: "Photography", isCovered: true },
    { id: "evt005", name: "Tech Conference Closing Remarks", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 0, assignedPersonnelIds: ["user001", "user003"], isQuickTurnaround: true, deadline: "2024-09-17T23:59:00", organizationId: "org_damion_hamilton", discipline: "Photography", isCovered: true },
    { id: "evt006", name: "Festival Workshop Photography", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-16", time: "10:00 - 12:00", priority: "Medium", deliverables: 2, shotRequests: 0, assignedPersonnelIds: ["user001", "user005"], organizationId: "org_g9e", discipline: "Photography", isCovered: true},
  ...generateG9eSummitEvents(),
];

// Function to combine events and dynamically created today's events
const getInitialEventsWithDynamicToday = (useDemo: boolean): Event[] => {
  if (!useDemo) return [];
  let baseEvents = [...initialMockEventsRaw];
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const dynamicTodayEvents: Event[] = [
    {
      id: "evt_today_completed_test", name: "Demo: Recently Completed Shoot", projectId: "proj001", project: "Summer Music Festival 2024",
      date: todayStr, time: `${format(subHours(now, 2), "HH:mm")} - ${format(subHours(now, 1), "HH:mm")}`, priority: "Medium", deliverables: 1,
      shotRequests: 0, assignedPersonnelIds: ["user001"],
      isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: true,
    },
    {
      id: "evt_today_inprogress_test", name: "Demo: Current Live Shoot", projectId: "proj001", project: "Summer Music Festival 2024",
      date: todayStr, time: `${format(subHours(now, 0.5), "HH:mm")} - ${format(addHours(now, 0.5), "HH:mm")}`, priority: "High", deliverables: 2,
      shotRequests: 0, assignedPersonnelIds: ["user002", "user003"],
      isQuickTurnaround: true, deadline: format(addHours(now, 4), "yyyy-MM-dd'T'HH:mm:ss"), organizationId: "org_g9e", discipline: "Photography", isCovered: true,
    },
    {
      id: "evt_today_upcoming_test", name: "Demo: Upcoming Photo Session Today", projectId: "proj001", project: "Summer Music Festival 2024",
      date: todayStr, time: `${format(addHours(now, 1), "HH:mm")} - ${format(addHours(now, 2), "HH:mm")}`, priority: "Critical", deliverables: 0,
      shotRequests: 0, assignedPersonnelIds: ["user004", "user005"],
      isQuickTurnaround: true, deadline: format(addHours(now, 6), "yyyy-MM-dd'T'HH:mm:ss"), organizationId: "org_g9e", discipline: "Photography", isCovered: true,
    }
  ];
  return [...baseEvents, ...dynamicTodayEvents];
};


export function EventProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId, projects } = useProjectContext();
  const { selectedOrganizationId } = useOrganizationContext();

  const [allEventsState, setAllEventsState] = useState<Event[]>([]);
  const [shotRequestsByEventId, setShotRequestsByEventId] = useState<Record<string, ShotRequest[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      let loadedEvents = getInitialEventsWithDynamicToday(useDemoData);
      const initialShots = mapInitialShotsToEvents(loadedEvents, initialShotRequestsMock);
      
      const loadedShotsByEvent: Record<string, ShotRequest[]> = {};
      initialShots.forEach(shot => {
        if (!loadedShotsByEvent[shot.eventId]) {
          loadedShotsByEvent[shot.eventId] = [];
        }
        loadedShotsByEvent[shot.eventId].push(shot);
      });

      // Update shotRequests count on each event
      loadedEvents = loadedEvents.map(event => ({
        ...event,
        shotRequests: loadedShotsByEvent[event.id]?.length || 0,
      }));
      
      setAllEventsState(loadedEvents);
      setShotRequestsByEventId(loadedShotsByEvent);
      setIsLoadingEvents(false);
    }
  }, [useDemoData, isLoadingSettings]);

  const addEvent = useCallback((eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap'>) => {
    const projectForEvent = projects.find(p => p.id === eventData.projectId);

    setAllEventsState((prevEvents) => {
      const newEvent: Event = {
        ...eventData,
        id: `evt${String(prevEvents.length + 1 + Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        project: projectForEvent?.name || "Unknown Project",
        deliverables: 0,
        shotRequests: 0, 
        hasOverlap: false,
        organizationId: projectForEvent?.organizationId || eventData.organizationId || "",
        discipline: eventData.discipline || "",
        isCovered: eventData.isCovered === undefined ? true : eventData.isCovered,
      };
      return [...prevEvents, newEvent];
    });
  }, [projects]);

  const updateEvent = useCallback((eventId: string, eventData: Partial<Omit<Event, 'id' | 'hasOverlap' | 'project'>>) => {
    let projectName = eventData.projectId ? projects.find(p => p.id === eventData.projectId)?.name : undefined;
    let orgId = eventData.projectId ? projects.find(p => p.id === eventData.projectId)?.organizationId : undefined;

    setAllEventsState((prevEvents) =>
      prevEvents.map((evt) => {
        if (evt.id === eventId) {
            const updatedEvent = { ...evt, ...eventData };
            if (projectName) updatedEvent.project = projectName;
            if (orgId) updatedEvent.organizationId = orgId;
            if (eventData.discipline !== undefined) updatedEvent.discipline = eventData.discipline;
            if (eventData.isCovered !== undefined) updatedEvent.isCovered = eventData.isCovered;
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
      id: `sr${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      eventId: eventId,
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
      let newEventShots = eventShots.map(shot =>
        shot.id === shotId ? { ...shot, ...updatedData } : shot
      );
      
      // Clear blockedReason if status is not "Blocked"
      const targetShot = newEventShots.find(s => s.id === shotId);
      if (targetShot && targetShot.status !== "Blocked" && targetShot.blockedReason) {
        newEventShots = newEventShots.map(shot => 
          shot.id === shotId ? { ...shot, blockedReason: "" } : shot
        );
      }
      
      return {
        ...prev,
        [eventId]: newEventShots,
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


  const eventsForSelectedProjectAndOrg = useMemo(() => {
    if (isLoadingEvents) return [];

    let filteredByOrg = allEventsState;
    if (selectedOrganizationId && selectedOrganizationId !== ALL_ORGANIZATIONS_ID) {
      filteredByOrg = allEventsState.filter(event => event.organizationId === selectedOrganizationId);
    }

    if (!selectedProjectId) {
      return filteredByOrg;
    }

    return filteredByOrg.filter(event => event.projectId === selectedProjectId);
  }, [allEventsState, selectedProjectId, selectedOrganizationId, isLoadingEvents]);


  const getEventById = useCallback((eventId: string) => {
    return allEventsState.find(event => event.id === eventId);
  }, [allEventsState]);


  const value = useMemo(() => ({
    allEvents: allEventsState,
    eventsForSelectedProjectAndOrg: eventsForSelectedProjectAndOrg,
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
  }), [
      allEventsState, eventsForSelectedProjectAndOrg, addEvent, updateEvent, deleteEvent, isLoadingEvents, getEventById,
      shotRequestsByEventId, getShotRequestsForEvent, addShotRequest, updateShotRequest, deleteShotRequest
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
    
