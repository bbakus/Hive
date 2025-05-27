
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext, type Project } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page';
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay } from 'date-fns';

// Define ShotRequest types and schema here
export const shotRequestSchema = z.object({
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  shotType: z.enum(["Wide", "Medium", "Close-up", "Drone", "Gimbal", "Interview", "B-Roll", "Other"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum(["Planned", "Assigned", "Captured", "Reviewed", "Blocked"]),
  notes: z.string().optional(),
});
export type ShotRequestFormData = z.infer<typeof shotRequestSchema>;
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
  // Add some shots for the dynamic today events
  { id: "sr_today_comp_001", eventId: "evt_today_completed_test", description: "Wrap-up shots", shotType: "B-Roll", priority: "Medium", status: "Planned"},
  { id: "sr_today_prog_001", eventId: "evt_today_inprogress_test", description: "Live action main shot", shotType: "Medium", priority: "High", status: "Planned"},
  { id: "sr_today_prog_002", eventId: "evt_today_inprogress_test", description: "Behind the scenes", shotType: "B-Roll", priority: "Low", status: "Planned"},
  { id: "sr_today_upc_001", eventId: "evt_today_upcoming_test", description: "Pre-event ambiance", shotType: "Wide", priority: "Medium", status: "Planned"},
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

      const morningEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter}`;
      const afternoonEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_aft_${eventIdCounter + 2}`; 
      const eveningEventId = `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_eve_${eventIdCounter + 3}`; 

      const morningShots = initialShotRequestsMock.filter(s => s.eventId === morningEventId).length;
      const afternoonShots = initialShotRequestsMock.filter(s => s.eventId === afternoonEventId).length;
      const eveningShots = initialShotRequestsMock.filter(s => s.eventId === eveningEventId).length;


      summitEvents.push({
        id: morningEventId,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Morning Coverage`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "09:00 - 12:30",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1,
        shotRequests: morningShots > 0 ? morningShots : ( (dayIndex + photographerIndex) % 2 === 0 ? 3 : 2),
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
        id: afternoonEventId,
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
          id: eveningEventId,
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
      eventIdCounter++; // Increment counter after each photographer's day
    });
  });
  return summitEvents;
};

const initialMockEvents: Event[] = [
    { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: initialShotRequestsMock.filter(s=>s.eventId==="evt001").length, assignedPersonnelIds: ["user001", "user002", "user006"], isQuickTurnaround: true, deadline: "2024-07-16T10:00:00", organizationId: "org_g9e", discipline: "Video", isCovered: true },
    { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: initialShotRequestsMock.filter(s=>s.eventId==="evt002").length, assignedPersonnelIds: ["user003", "user007"], deadline: "2024-09-15T12:00:00", organizationId: "org_damion_hamilton", discipline: "Both", isCovered: true },
    { id: "evt003", name: "VIP Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: false },
    { id: "evt004", name: "Artist Meet & Greet", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: initialShotRequestsMock.filter(sr => sr.eventId === "evt004").length, assignedPersonnelIds: ["user004", "user006"], organizationId: "org_g9e", discipline: "Photography", isCovered: true },
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
      let loadedEvents = useDemoData ? [...initialMockEvents] : []; 
      const loadedShots: Record<string, ShotRequest[]> = {};

      if (useDemoData) {
        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");

        const completedStart = subHours(now, 2);
        const completedEnd = subHours(now, 1);
        const inProgressStart = subHours(now, 0.5); 
        const inProgressEnd = addHours(now, 0.5);   
        const upcomingStart = addHours(now, 1);
        const upcomingEnd = addHours(now, 2);

        const dynamicEventsToAdd: Event[] = [
            {
              id: "evt_today_completed_test", name: "Demo: Recently Completed", projectId: "proj001", project: "Summer Music Festival 2024",
              date: todayStr, time: `${format(completedStart, "HH:mm")} - ${format(completedEnd, "HH:mm")}`, priority: "Medium", deliverables: 1,
              shotRequests: initialShotRequestsMock.filter(s => s.eventId === "evt_today_completed_test").length, assignedPersonnelIds: ["user001"],
              isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Video", isCovered: true,
            },
            {
              id: "evt_today_inprogress_test", name: "Demo: Currently In Progress", projectId: "proj001", project: "Summer Music Festival 2024",
              date: todayStr, time: `${format(inProgressStart, "HH:mm")} - ${format(inProgressEnd, "HH:mm")}`, priority: "High", deliverables: 2,
              shotRequests: initialShotRequestsMock.filter(s => s.eventId === "evt_today_inprogress_test").length, assignedPersonnelIds: ["user002", "user003"],
              isQuickTurnaround: true, deadline: format(addHours(now, 4), "yyyy-MM-dd'T'HH:mm:ss"), organizationId: "org_g9e", discipline: "Both", isCovered: true,
            },
            {
              id: "evt_today_upcoming_test", name: "Demo: Upcoming Today", projectId: "proj001", project: "Summer Music Festival 2024",
              date: todayStr, time: `${format(upcomingStart, "HH:mm")} - ${format(upcomingEnd, "HH:mm")}`, priority: "Critical", deliverables: 0,
              shotRequests: initialShotRequestsMock.filter(s => s.eventId === "evt_today_upcoming_test").length, assignedPersonnelIds: ["user004", "user005"],
              isQuickTurnaround: true, deadline: format(addHours(now, 6), "yyyy-MM-dd'T'HH:mm:ss"), organizationId: "org_g9e", discipline: "Photography", isCovered: true,
            }
        ];
        loadedEvents = [...loadedEvents, ...dynamicEventsToAdd];
        
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
      return {
        ...prev,
        [eventId]: eventShots.map(shot =>
          shot.id === shotId ? { ...shot, ...shotData, ...updatedData } : shot // Ensure all fields are there
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

    
