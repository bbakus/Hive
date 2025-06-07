
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay, parseISO, isValid, isBefore, subDays, addDays } from 'date-fns';

// --- Context Type Definition ---
interface EventContextType {
  allEvents: Event[];
  eventsForSelectedProjectAndOrg: Event[];
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> & { organizationId: string; projectId: string }) => string;
  updateEvent: (eventId: string, eventData: Partial<Omit<Event, 'id' | 'project' | 'hasOverlap'>>) => void;
  deleteEvent: (eventId: string) => void;
  isLoadingEvents: boolean;
  getEventById: (id: string) => Event | undefined;
  shotRequestsByEventId: Record<string, ShotRequest[]>;
  getShotRequestsForEvent: (eventId: string) => ShotRequest[];
  addShotRequest: (eventId: string, shotData: ShotRequestFormData) => void;
  updateShotRequest: (eventId: string, shotId: string, updatedData: Partial<ShotRequestFormData>) => void;
  deleteShotRequest: (eventId: string, shotId: string) => void;
  checkInUserToEvent: (eventId: string, personnelId: string) => void;
  checkOutUserFromEvent: (eventId: string, personnelId: string) => void;
}

// --- Event Context ---
import { useSettingsContext } from './SettingsContext';
import { useProjectContext } from './ProjectContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';

const EventContext = createContext<EventContextType | undefined>(undefined);

// --- Shot Request Definitions ---
export const shotRequestSchemaInternal = z.object({
  title: z.string().optional(), 
  description: z.string().min(3, { message: "Description must be at least 3 characters." }),
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

// --- Event Definition ---
export type Event = {
  name: string;
  personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
  date: string; // Add date property
  id: string;
  organizationId?: string;
  projectId: string; // Add projectId here
  project: string; // Project name for display
  deliverables: number; // Count of deliverables
  shotRequests: number; // Count of associated shot requests
  hasOverlap?: boolean; // Add hasOverlap property
  time: string; // Add time property
  discipline?: "Photography" | "";
  assignedPersonnelIds: string[]; // Add assignedPersonnelIds property
  isCovered: boolean; // Add isCovered property
  isQuickTurnaround: boolean; // Add isQuickTurnaround property
  location?: string; // Add location property
  status?: string; // Add status property
  description?: string; // Add description property
  deadline?: string; // Add deadline property
};



// Type for raw event data from backend or demo JSON
type EventDataSource = {
  eventId: string; // From demo JSON
  id?: string; // From backend/internal
  name: string;
  date: string;
  time?: string; // Optional in demo data
  location?: string | null;
  status?: string | null; // Optional in demo data
  description?: string | null;
  assignedPersonnelIds?: string[]; // Optional in demo data
  isQuickTurnaround?: boolean; // Optional in demo data
  deadline?: string; // Optional in demo data
  organizationId?: string; // Optional in demo data
  discipline?: "Photography" | ""; // Optional in demo data
  isCovered?: boolean; // Optional in demo data
  personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>; // Optional
  projectId: string; // Must be present in demo data
  shots?: ShotRequestDataSource[]; // Shots within event in demo JSON
};

type ShotRequestDataSource = ShotRequestFormData & {
  id?: string; // Optional in demo data
  eventId?: string; // Optional in demo data, derived from parent event
};



export function EventProvider({ children }: { children: ReactNode }) {
  const { useDemoData, isLoading: isLoadingSettings } = useSettingsContext();
  const { selectedProjectId, projects, selectedProject } = useProjectContext();
  const { selectedOrganizationId } = useOrganizationContext();

  const [allEventsState, setAllEventsState] = useState<Event[]>([]);
  const [shotRequestsByEventId, setShotRequestsByEventId] = useState<Record<string, ShotRequest[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (isLoadingSettings) return;

      setIsLoadingEvents(true);
      let loadedEvents: Event[] = [];
      let loadedShotsByEventId: Record<string, ShotRequest[]> = {};

      if (useDemoData) {
        try {
          const response = await fetch('/demo/demo_data.json');
          if (response.ok) {
            const demoData = await response.json(); 
            
            if (demoData && Array.isArray(demoData.events)) {
              loadedEvents = demoData.events.map((evtData: EventDataSource) => {
                const eventId = evtData.eventId || evtData.id; 
                if (!eventId) {
                    console.error("Demo event data missing id:", evtData);
                    return null; 
                }

                if (Array.isArray(evtData.shots)) {
                    loadedShotsByEventId[eventId] = evtData.shots.map((shotData: ShotRequestDataSource, index) => ({
                        ...shotData,
                        id: shotData.id || `demo_sr_${eventId}_${index}`, 
                        eventId: eventId, 
                        description: shotData.description || "", 
                        priority: shotData.priority || "Medium", 
                        status: shotData.status || "Unassigned", 
                    })).filter(shot => shot !== null) as ShotRequest[]; 
                } else {
                     loadedShotsByEventId[eventId] = []; 
                }

                const projectForEvent = projects.find(p => p.id === evtData.projectId); 

                return {
                  id: eventId,
                  name: evtData.name,
                  projectId: evtData.projectId,
                  project: projectForEvent?.name || "Unknown Project",
                  date: evtData.date,
                  time: evtData.time || "", 
                  location: evtData.location || "",
                  status: evtData.status || "Upcoming", 
                  description: evtData.description || "",
                  assignedPersonnelIds: evtData.assignedPersonnelIds || [],
                  isQuickTurnaround: evtData.isQuickTurnaround || false,
                  deadline: evtData.deadline,
                  deliverables: 0, 
                  shotRequests: (loadedShotsByEventId[eventId]?.length || 0), 
                  organizationId: evtData.organizationId || projectForEvent?.organizationId || "", 
                  discipline: evtData.discipline || "",
                  isCovered: evtData.isCovered === undefined ? true : evtData.isCovered,
                  personnelActivity: evtData.personnelActivity || {},
                };
              }).filter((event: Event | null): event is Event => event !== null) as Event[];

            } else {
               console.error("Demo data file does not contain an 'events' array or is empty.");
            }
          } else {
            console.error("Failed to read demo data file. Status:", response.status, response); 
          }
        } catch (error) {
          console.error("Error processing demo data JSON:", error);
        }
      } else {
        // Fetch live data
        try {
          const response = await fetch('/api/events'); 
          if (!response.ok) {
            // Log error but don't throw, allow fallback to empty data
            console.error(`Failed to fetch events from /api/events. Status: ${response.status}. Message: ${await response.text()}`);
            // loadedEvents will remain empty, as will loadedShotsByEventId
          } else {
            const data: { events: EventDataSource[] } = await response.json(); 
            
            data.events.forEach(be => {
               const eventId = String(be.id || be.eventId); 
               if (!eventId) return; 

              const projectForEvent = projects.find(p => p.id === be.projectId); 

              const frontendEvent: Event = {
                id: eventId, 
                name: be.name,
                project: projectForEvent?.name || "Unknown Project", 
                projectId: be.projectId || "unknown_project_id", 
                date: be.date,
                time: be.time || "", 
                assignedPersonnelIds: be.assignedPersonnelIds || [],
                shotRequests: (be.shots || []).length,
                deliverables: 0, 
                isQuickTurnaround: be.isQuickTurnaround || false,
                deadline: be.deadline,
                organizationId: be.organizationId || projectForEvent?.organizationId || "", 
                discipline: be.discipline || "",
                isCovered: be.isCovered === undefined ? true : be.isCovered,
                personnelActivity: be.personnelActivity || {},
                description: be.description || "", 
                location: be.location || "", 
                status: be.status || "Upcoming", 
              };
              loadedEvents.push(frontendEvent);

              const shotsForThisEvent: ShotRequest[] = (be.shots || []).map((shotData, index) => ({
                ...shotData,
                id: shotData.id || `live_sr_${eventId}_${index}`, 
                eventId: eventId,
                 description: shotData.description || "", 
                priority: shotData.priority || "Medium", 
                status: shotData.status || "Unassigned", 
              })).filter(shot => shot !== null) as ShotRequest[];
              loadedShotsByEventId[eventId] = shotsForThisEvent;
            });
          }
        } catch (error) {
          console.error("Error fetching live event data:", error);
          // Fallback to empty data if live fetch fails entirely
          loadedEvents = []; 
          loadedShotsByEventId = {};
        }
      }
      
      setAllEventsState(loadedEvents);
      setShotRequestsByEventId(loadedShotsByEventId);
      setIsLoadingEvents(false);
    };
    
    loadData();
  }, [useDemoData, isLoadingSettings, selectedProject, projects]); 


  const addEvent = useCallback((eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> & { organizationId: string; projectId: string }): string => {
    const projectForEvent = projects.find(p => p.id === eventData.projectId); 
    const newEventId = `evt_new_${Date.now()}`;
    const newEvent: Event = {
      ...eventData,
      id: newEventId,
      project: projectForEvent?.name || "Unknown Project",
      deliverables: 0, 
      shotRequests: 0, 
      hasOverlap: false, 
      organizationId: eventData.organizationId || projectForEvent?.organizationId || "",
      discipline: eventData.discipline === "Photography" ? "Photography" : "",
      isCovered: eventData.isCovered === undefined ? true : eventData.isCovered,
      personnelActivity: {},
    };
    
    setAllEventsState(prevEvents => [...prevEvents, newEvent]);
    setShotRequestsByEventId(prev => ({ ...prev, [newEventId]: [] }));

    if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to add event:", newEvent);
    }

    return newEventId;
  }, [projects, useDemoData]); 

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
    
    if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to update event:", eventId, eventData);
    }
  }, [projects, useDemoData]); 

  const deleteEvent = useCallback((eventId: string) => {
    setAllEventsState((prevEvents) =>
      prevEvents.filter((evt) => evt.id !== eventId)
    );
    setShotRequestsByEventId(prevShots => {
      const newShots = {...prevShots};
      delete newShots[eventId];
      return newShots;
    });
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to delete event:", eventId);
    }
  }, [useDemoData]); 

  const getShotRequestsForEvent = useCallback((eventId: string): ShotRequest[] => {
    return shotRequestsByEventId[eventId] || [];
  }, [shotRequestsByEventId]);

  const addShotRequest = useCallback((eventId: string, shotData: ShotRequestFormData) => {
    const newShot: ShotRequest = {
      ...shotData,
      description: shotData.description,
      priority: shotData.priority || "Medium",
      status: shotData.status || "Unassigned",
      assignedPersonnelId: shotData.assignedPersonnelId || undefined,
      notes: shotData.notes || undefined,
      blockedReason: shotData.blockedReason || undefined,
      initialCapturerId: shotData.initialCapturerId || undefined,
      lastStatusModifierId: shotData.lastStatusModifierId || undefined,
      lastStatusModifiedAt: shotData.lastStatusModifiedAt || undefined,
      id: `sr_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      eventId: eventId,
    };
    setShotRequestsByEventId(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newShot],
    }));
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: (shotRequestsByEventId[eventId] ? shotRequestsByEventId[eventId].length + 1 : 1) } : evt
    ));
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to add shot request:", eventId, newShot);
    }

  }, [shotRequestsByEventId, useDemoData]); 

  const updateShotRequest = useCallback((eventId: string, shotId: string, updatedData: Partial<ShotRequestFormData>) => {
    setShotRequestsByEventId(prev => {
      const eventShots = prev[eventId] || [];
      const newEventShots = eventShots.map(shot => {
        if (shot.id === shotId) {
          let newShotData = { ...shot, ...updatedData };
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
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to update shot request:", eventId, shotId, updatedData);
    }
  }, [useDemoData]); 

  const deleteShotRequest = useCallback((eventId: string, shotId: string) => {
    let newShotRequestsCount = 0;
    setShotRequestsByEventId(prev => {
      const eventShots = prev[eventId] || [];
      const updatedShots = eventShots.filter(shot => shot.id !== shotId);
      newShotRequestsCount = updatedShots.length;
      const updatedShotsByEventId = {...prev};
      if (updatedShots.length > 0) {
        updatedShotsByEventId[eventId] = updatedShots;
      } else if (prev[eventId]) {
        delete updatedShotsByEventId[eventId];
      }
      return updatedShotsByEventId;
    });
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: newShotRequestsCount } : evt
    ));
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to delete shot request:", eventId, shotId);
    }
  }, [useDemoData]); 

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
          const updatedEvent = { ...event, personnelActivity: newPersonnelActivity };
           if (!useDemoData) {
              console.warn("Demo data mode is off. Implement actual API call for check-in:", eventId, personnelId);
           }
          return updatedEvent;
        }
        return event;
      })
    );
  }, [useDemoData]); 

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
           const updatedEvent = { ...event, personnelActivity: newPersonnelActivity };
           if (!useDemoData) {
              console.warn("Demo data mode is off. Implement actual API call for check-out:", eventId, personnelId);
           }
          return updatedEvent;
        }
        return event;
      })
    );
  }, [useDemoData]); 

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
