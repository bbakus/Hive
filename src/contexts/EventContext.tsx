
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page'; // Use existing type

export type Event = EventTypeDefinition;

type EventContextType = {
  allEvents: Event[]; // All events, unfiltered by project
  eventsForSelectedProject: Event[];
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
  let eventIdCounter = 100; // Start from a higher number to avoid collision with existing IDs

  g9eSummitDays.forEach((day, dayIndex) => {
    g9eSummitPhotographers.forEach((photographerId, photographerIndex) => {
      const photographerName = `Photographer ${String.fromCharCode(65 + photographerIndex)}`; // A, B, C...

      // Morning Session
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
      });

      // Lunch Break
      summitEvents.push({
        id: `evt_summit_d${dayIndex + 1}_p${photographerIndex + 1}_lunch_${eventIdCounter++}`,
        name: `${photographerName} - Summit Day ${dayIndex + 1} Lunch Break`,
        projectId: g9eSummitProjectId,
        project: "G9e Corporate Summit 2024",
        date: day,
        time: "12:30 - 13:30",
        priority: "Low", // Breaks are low priority for event types but important for scheduling
        assignedPersonnelIds: [photographerId],
        deliverables: 0,
        shotRequests: 0,
        organizationId: g9eOrgId,
      });

      // Afternoon Session
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
      });

      // Optional Evening Session (for some)
      if (photographerIndex % 2 === 0) { // e.g., half the photographers cover evening
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
        });
      }
    });
  });
  return summitEvents;
};


const initialMockEvents: Event[] = [
  { id: "evt001", name: "Main Stage - Day 1", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "14:00 - 23:00", priority: "High", deliverables: 5, shotRequests: 3, assignedPersonnelIds: ["user001", "user002", "user006"], isQuickTurnaround: true, deadline: "2024-07-16T10:00", organizationId: "org_g9e" },
  { id: "evt002", name: "Keynote Speech", projectId: "proj002", project: "Tech Conference X", date: "2024-09-15", time: "09:00 - 10:00", priority: "Critical", deliverables: 2, shotRequests: 1, assignedPersonnelIds: ["user003", "user007"], deadline: "2024-09-15T12:00", organizationId: "org_damion_hamilton" },
  { id: "evt003", name: "VIP Reception", projectId: "proj003", project: "Corporate Gala Dinner", date: "2024-11-05", time: "18:00 - 19:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: [], isQuickTurnaround: false, organizationId: "org_g9e" },
  { id: "evt004", name: "Artist Meet & Greet", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-15", time: "17:00 - 18:00", priority: "Medium", deliverables: 1, shotRequests: 0, assignedPersonnelIds: ["user004", "user006"], organizationId: "org_g9e" },
  { id: "evt005", name: "Closing Ceremony", projectId: "proj002", project: "Tech Conference X", date: "2024-09-17", time: "16:00 - 17:00", priority: "High", deliverables: 3, shotRequests: 0, assignedPersonnelIds: ["user001", "user003", "user005"], isQuickTurnaround: true, deadline: "2024-09-17T23:59", organizationId: "org_damion_hamilton" },
  { id: "evt006", name: "Workshop Alpha", projectId: "proj001", project: "Summer Music Festival 2024", date: "2024-07-16", time: "10:00 - 12:00", priority: "Medium", deliverables: 2, shotRequests: 0, assignedPersonnelIds: ["user001", "user005"], organizationId: "org_g9e"},
  ...generateG9eSummitEvents(), // Add the new detailed G9e Summit events
];


export function EventProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId } = useProjectContext();

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
    setAllEventsState((prevEvents) => {
      const newEvent: Event = {
        ...eventData,
        id: `evt${String(prevEvents.length + 1 + Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        project: "Unknown Project (Context Placeholder)", // Placeholder, ideally resolve from projectId
        deliverables: 0, // Default value
        shotRequests: 0, // Default value
        hasOverlap: false, // Default value
      };
      // TODO: Resolve project name from projectId if needed
      return [...prevEvents, newEvent];
    });
  }, []);

  const updateEvent = useCallback((eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => {
    setAllEventsState((prevEvents) =>
      prevEvents.map((evt) =>
        evt.id === eventId ? { ...evt, ...eventData } : evt
      )
    );
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setAllEventsState((prevEvents) =>
      prevEvents.filter((evt) => evt.id !== eventId)
    );
  }, []);

  const eventsForSelectedProject = useMemo(() => {
    if (isLoadingEvents) return [];
    if (!selectedProjectId) return allEventsState; // Or an empty array if "All Projects" shouldn't show all events
    return allEventsState.filter(event => event.projectId === selectedProjectId);
  }, [allEventsState, selectedProjectId, isLoadingEvents]);

  const getEventById = useCallback((eventId: string) => {
    return allEventsState.find(event => event.id === eventId);
  }, [allEventsState]);


  const value = useMemo(() => ({
    allEvents: allEventsState,
    eventsForSelectedProject,
    addEvent,
    updateEvent,
    deleteEvent,
    isLoadingEvents,
    getEventById,
  }), [allEventsState, eventsForSelectedProject, addEvent, updateEvent, deleteEvent, isLoadingEvents, getEventById]);

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
