
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext, type Project } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page';
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay } from 'date-fns'; // Added date-fns functions

// Define ShotRequest types and schema here
const shotRequestSchemaInternal = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  shotType: z.enum(["Wide", "Medium", "Close-up", "Drone", "Gimbal", "Interview", "B-Roll", "Other"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum(["Planned", "Assigned", "Captured", "Reviewed", "Blocked"]),
  notes: z.string().optional(),
});
export type ShotRequestFormData = z.infer<typeof shotRequestSchemaInternal>;
export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
};

export type Event = EventTypeDefinition;

// Initial Mock Data for Shot Requests
const initialShotRequestsMock: ShotRequest[] = [
  { id: "sr001", eventId: "evt001", description: "Opening wide shot of the crowd", shotType: "Wide", priority: "High", status: "Planned", notes: "Get this as gates open" },
  { id: "sr002", eventId: "evt001", description: "Close-up of lead singer - Song 3", shotType: "Close-up", priority: "Critical", status: "Planned" },
  { id: "sr003", eventId: "evt001", description: "Audience reaction shots - various songs", shotType: "B-Roll", priority: "Medium", status: "Planned" },
  { id: "sr004", eventId: "evt002", description: "Speaker walking onto stage", shotType: "Medium", priority: "High", status: "Captured" },
  { id: "sr_summit_001", eventId: "evt_summit_d1_p1_morn_100", description: "Wide shot of keynote speaker on Day 1 Morning", shotType: "Wide", priority: "High", status: "Planned" },
  { id: "sr_summit_002", eventId: "evt_summit_d1_p1_morn_100", description: "Audience listening intently", shotType: "Medium", priority: "Medium", status: "Planned" },
  { id: "sr_summit_003", eventId: "evt_summit_d1_p2_aft_107", description: "Workshop interaction - Photographer B", shotType: "B-Roll", priority: "Medium", status: "Planned" },
  // Add some shots for the new dynamic today events
  { id: "sr_today_001", eventId: "evt_today_early", description: "Early morning setup shots", shotType: "B-Roll", priority: "Medium", status: "Planned"},
  { id: "sr_today_002", eventId: "evt_today_early", description: "First guest arrival", shotType: "Medium", priority: "High", status: "Planned"},
  { id: "sr_today_003", eventId: "evt_today_late", description: "Main presentation wide shot", shotType: "Wide", priority: "Critical", status: "Planned"},
  { id: "sr_today_004", eventId: "evt_today_late", description: "Speaker close-up", shotType: "Close-up", priority: "High", status: "Planned"},
];


type EventContextType = {
  allEvents: Event[];
  eventsForSelectedProjectAndOrg: Event[];
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap'>) => void;
  updateEvent: (eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => void;
  deleteEvent: (eventId: string) => void;
  isLoadingEvents: boolean;
  getEventById: (eventId: string) => Event | undefined;
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
  const disciplines: Event['discipline'][] = ["Photography", "Video", "Both", ""];

  g9eSummitDays.forEach((day, dayIndex) => {
    g9eSummitPhotographers.forEach((photographerId, photographerIndex) => {
      const photographerName = `Photographer ${String.fromCharCode(65 + photographerIndex)}`;
      const morningDiscipline = disciplines[(dayIndex + photographerIndex) % disciplines.length];
      const afternoonDiscipline = disciplines[(dayIndex + photographerIndex + 1) % disciplines.length];
      const eveningDiscipline = disciplines[(dayIndex + photographerIndex + 2) % disciplines.length];

      const morningShots = initialShotRequestsMock.filter(s => s.eventId === `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter}`).length;
      const afternoonShots = initialShotRequestsMock.filter(s => s.eventId === `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_aft_${eventIdCounter + 2}`).length; // Approx ID
      const eveningShots = initialShotRequestsMock.filter(s => s.eventId === `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_eve_${eventIdCounter + 3}`).length; // Approx ID


      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Morning Coverage`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "09:00 - 12:30",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1,
        shotRequests: morningShots > 0 ? morningShots : ( (dayIndex + photographerIndex) % 2 === 0 ? 3 : 2), // some default if no specific mock
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
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_aft_${eventIdCounter++}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Afternoon Workshops`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "13:30 - 17:00",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1,
        shotRequests: afternoonShots > 0 ? afternoonShots : ( (dayIndex + photographerIndex + 1) % 2 === 0 ? 4 : 2),
        organizationId: g9eOrgId,
        discipline: afternoonDiscipline,
        isCovered: true,
      });
      
      if (dayIndex === 0 && photographerIndex < 2) {
         summitEvents.push({
            id: `evt_summit_internal_prep_${photographerIndex}_${eventIdCounter++}`,
            name: `Internal Prep Meeting - Team ${String.fromCharCode(65 + photographerIndex)}`,
            projectId: g9eSummitProjectId,
            project: "G9e Corporate Summit 2024",
            date: day,
            time: "08:00 - 08:45",
            priority: "Medium",
            assignedPersonnelIds: [photographerId, "user007"],
            deliverables: 0,
            shotRequests: 0,
            organizationId: g9eOrgId,
            discipline: "",
            isCovered: false, 
        });
      }

      if (photographerIndex % 2 === 0) {
        summitEvents.push({
          id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_eve_${eventIdCounter++}`,
          name: `${photographerName} - Summit Day ${dayIndex + 1} Evening Reception`,
          projectId: g9eSummitProjectId,
          project: "G9e Corporate Summit 2024",
          date: day,
          time: "18:30 - 20:30",
          priority: "Medium",
          assignedPersonnelIds: [photographerId],
          deliverables: 0,
          shotRequests: eveningShots > 0 ? eveningShots : 1,
          organizationId: g9eOrgId,
          discipline: eveningDiscipline,
          isQuickTurnaround: (dayIndex + photographerIndex) % 4 === 0,
          isCovered: true,
        });
      }
    });
  });
  return summitEvents;
};

const initialMockEvents: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: initialShotRequestsMock.filter(s=>s.eventId==="evt001").length, assignedPersonnelIds: ["user001", "user002", "user006"], isQuickTurnaround: true, deadline: "2024-07-16T10:00:00", organizationId: "org_g9e", discipline: "Video", isCovered: true },
    { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: initialShotRequestsMock.filter(s=>s.eventId==="evt002").length, assignedPersonnelIds: ["user003", "user007"], deadline: "2024-09-15T12:00:00", organizationId: "org_damion_hamilton", discipline: "Both", isCovered: true },
    { id: "evt003", name: "VIP Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: false },
    { id: "evt004", name: "Artist Meet & Greet", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: ["user004", "user006"], organizationId: "org_g9e", discipline: "Photography", isCovered: true },
    { id: "evt005", name: "Closing Ceremony", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 0, assignedPersonnelIds: ["user001", "user003", "user005"], isQuickTurnaround: true, deadline: "2024-09-17T23:59:00", organizationId: "org_damion_hamilton", discipline: "Video", isCovered: true },
    { id: "evt006", name: "Workshop Alpha", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-16", time: "10:00 - 12:00", priority: "Medium", deliverables: 2, shotRequests: initialShotRequestsMock.filter(sr => sr.eventId === "evt006").length, assignedPersonnelIds: ["user001", "user005"], organizationId: "org_g9e", discipline: "Both", isCovered: true},
  ...generateG9eSummitEvents(),
];


export function EventProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId, projects } = useProjectContext();
  const { selectedOrganizationId } = useOrganizationContext();

  const [allEventsState, setAllEventsState] = useState<Event[]>([]);
  const [shotRequestsByEventId, setShotRequestsByEventId] = useState<Record<string, ShotRequest[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      let loadedEvents = useDemoData ? [...initialMockEvents] : []; // Start with a copy
      const loadedShots: Record<string, ShotRequest[]> = {};

      if (useDemoData) {
        // Dynamically add events for today
        const today = new Date();
        const todayStr = format(today, "yyyy-MM-dd");

        const earlyTodayStart = setMinutes(setHours(startOfDay(today), 8), 0); // 8:00 AM
        const earlyTodayEnd = setMinutes(setHours(startOfDay(today), 11), 30); // 11:30 AM

        const lateTodayStart = setMinutes(setHours(startOfDay(today), 13), 0); // 1:00 PM
        const lateTodayEnd = setMinutes(setHours(startOfDay(today), 17), 0); // 5:00 PM


        loadedEvents.push({
          id: "evt_today_early",
          name: "Today's Early Shoot (Demo)",
          projectId: "proj001", // Summer Music Festival
          project: "Summer Music Festival 2024",
          date: todayStr,
          time: `${format(earlyTodayStart, "HH:mm")} - ${format(earlyTodayEnd, "HH:mm")}`,
          priority: "High",
          deliverables: 1,
          shotRequests: initialShotRequestsMock.filter(s => s.eventId === "evt_today_early").length,
          assignedPersonnelIds: ["user001", "user004"],
          isQuickTurnaround: true,
          deadline: format(addHours(today, 24), "yyyy-MM-dd'T'HH:mm:ss"),
          organizationId: "org_g9e",
          discipline: "Video",
          isCovered: true,
        });
        loadedEvents.push({
          id: "evt_today_late",
          name: "Today's Late Session (Demo)",
          projectId: g9eSummitProjectId, // G9e Corporate Summit
          project: "G9e Corporate Summit 2024",
          date: todayStr,
          time: `${format(lateTodayStart, "HH:mm")} - ${format(lateTodayEnd, "HH:mm")}`,
          priority: "Critical",
          deliverables: 2,
          shotRequests: initialShotRequestsMock.filter(s => s.eventId === "evt_today_late").length,
          assignedPersonnelIds: ["user003", "user005", "user006"],
          isQuickTurnaround: false,
          organizationId: "org_g9e",
          discipline: "Both",
          isCovered: true,
        });
        
        // Populate shot requests
        initialShotRequestsMock.forEach(shot => {
          if (!loadedShots[shot.eventId]) {
            loadedShots[shot.eventId] = [];
          }
          loadedShots[shot.eventId].push(shot);
        });
      }
      setAllEventsState(loadedEvents);
      setShotRequestsByEventId(loadedShots);
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

  const updateEvent = useCallback((eventId: string, eventData: Partial<Omit<Event, 'id' | 'hasOverlap'>>) => {
    let projectName = eventData.project;
    let orgId = eventData.organizationId;

    if (eventData.projectId) {
        const projectForEvent = projects.find(p => p.id === eventData.projectId);
        if (projectForEvent) {
            projectName = projectForEvent.name;
            orgId = projectForEvent.organizationId;
        }
    }

    setAllEventsState((prevEvents) =>
      prevEvents.map((evt) =>
        evt.id === eventId ? { 
            ...evt, 
            ...eventData, 
            project: projectName || evt.project, 
            organizationId: orgId || evt.organizationId, 
            discipline: eventData.discipline !== undefined ? eventData.discipline : evt.discipline,
            isCovered: eventData.isCovered !== undefined ? eventData.isCovered : evt.isCovered 
        } : evt
      )
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
      return {
        ...prev,
        [eventId]: eventShots.map(shot =>
          shot.id === shotId ? { ...shot, ...updatedData } : shot
        ),
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
    getShotRequestsForEvent,
    addShotRequest,
    updateShotRequest,
    deleteShotRequest,
  }), [
      allEventsState, eventsForSelectedProjectAndOrg, addEvent, updateEvent, deleteEvent, isLoadingEvents, getEventById,
      getShotRequestsForEvent, addShotRequest, updateShotRequest, deleteShotRequest
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

    