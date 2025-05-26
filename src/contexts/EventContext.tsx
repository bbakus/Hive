
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page'; 

export type Event = EventTypeDefinition; 

type EventContextType = {
  allEvents: Event[]; 
  eventsForSelectedProjectAndOrg: Event[]; 
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap'>) => void;
  updateEvent: (eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => void;
  deleteEvent: (eventId: string) => void;
  isLoadingEvents: boolean;
  getEventById: (eventId: string) => Event | undefined;
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


      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_morn_${eventIdCounter++}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Morning Coverage`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "09:00 - 12:30",
        priority: "High",
        assignedPersonnelIds: [photographerId],
        deliverables: 1,
        shotRequests: 5,
        organizationId: g9eOrgId,
        discipline: morningDiscipline,
        isQuickTurnaround: (dayIndex + photographerIndex) % 3 === 0,
        deadline: (dayIndex + photographerIndex) % 3 === 0 ? `${day}T18:00` : undefined,
        isCovered: true, // Most sessions are covered
      });

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
        isCovered: false, // Lunch breaks are not "coverage"
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
        shotRequests: 5,
        organizationId: g9eOrgId,
        discipline: afternoonDiscipline,
        isCovered: true,
      });
      
      // Simulate some internal project meetings not requiring external coverage
      if (dayIndex === 0 && photographerIndex < 2) {
         summitEvents.push({
            id: `evt_summit_internal_prep_${photographerIndex}_${eventIdCounter++}`,
            name: `Internal Prep Meeting - Team ${String.fromCharCode(65 + photographerIndex)}`,
            projectId: g9eSummitProjectId,
            project: "G9e Corporate Summit 2024",
            date: day,
            time: "08:00 - 08:45",
            priority: "Medium",
            assignedPersonnelIds: [photographerId, "user007"], // Add a lead
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
          shotRequests: 2,
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
    { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 3, assignedPersonnelIds: ["user001", "user002", "user006"], isQuickTurnaround: true, deadline: "2024-07-16T10:00", organizationId: "org_g9e", discipline: "Video", isCovered: true },
    { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 1, assignedPersonnelIds: ["user003", "user007"], deadline: "2024-09-15T12:00", organizationId: "org_damion_hamilton", discipline: "Both", isCovered: true },
    { id: "evt003", name: "VIP Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false, organizationId: "org_g9e", discipline: "Photography", isCovered: false },
    { id: "evt004", name: "Artist Meet & Greet", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: ["user004", "user006"], organizationId: "org_g9e", discipline: "Photography", isCovered: true },
    { id: "evt005", name: "Closing Ceremony", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 0, assignedPersonnelIds: ["user001", "user003", "user005"], isQuickTurnaround: true, deadline: "2024-09-17T23:59", organizationId: "org_damion_hamilton", discipline: "Video", isCovered: true },
    { id: "evt006", name: "Workshop Alpha", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-16", time: "10:00 - 12:00", priority: "Medium", deliverables: 2, shotRequests: 0, assignedPersonnelIds: ["user001", "user005"], organizationId: "org_g9e", discipline: "Both", isCovered: true},
  ...generateG9eSummitEvents(),
];


export function EventProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId, projects } = useProjectContext();
  const { selectedOrganizationId } = useOrganizationContext();

  const [allEventsState, setAllEventsState] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    if (!isLoadingSettings) {
      const loadedEvents = useDemoData ? initialMockEvents : [];
      setAllEventsState(loadedEvents);
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
        evt.id === eventId ? { ...evt, ...eventData, project: projectName || evt.project, organizationId: orgId || evt.organizationId, discipline: eventData.discipline !== undefined ? eventData.discipline : evt.discipline, isCovered: eventData.isCovered !== undefined ? eventData.isCovered : evt.isCovered } : evt
      )
    );
  }, [projects]);

  const deleteEvent = useCallback((eventId: string) => {
    setAllEventsState((prevEvents) =>
      prevEvents.filter((evt) => evt.id !== eventId)
    );
  }, []);

  const eventsForSelectedProjectAndOrg = useMemo(() => {
    if (isLoadingEvents) return [];

    let filteredByOrg = allEventsState;
    if (selectedOrganizationId !== ALL_ORGANIZATIONS_ID) {
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
  }), [allEventsState, eventsForSelectedProjectAndOrg, addEvent, updateEvent, deleteEvent, isLoadingEvents, getEventById]);

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
