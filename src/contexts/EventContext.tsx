
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from './ProjectContext';
import { useSettingsContext } from './SettingsContext';
import { useOrganizationContext, ALL_ORGANIZATIONS_ID } from './OrganizationContext';
import type { Event as EventTypeDefinition } from '@/app/(app)/events/page';
import { z } from 'zod';
import { format, addHours, subHours, setHours, setMinutes, startOfDay, parseISO, isValid, isBefore, subDays, addDays } from 'date-fns';

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
  lastStatusModifierId: z.string().optional().refine(val => !val || isValid(parseISO(val)), {
    message: "Last status modified must be a valid ISO date string or empty.",
  }),
});
export type ShotRequestFormData = z.infer<typeof shotRequestSchemaInternal>;
export type ShotRequest = ShotRequestFormData & {
  id: string;
  eventId: string;
};

// --- Event Definition ---
export type Event = EventTypeDefinition & {
   personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
   organizationId?: string;
   discipline?: "Photography" | "";
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
          const response = await default_api.read_file({ path: "public/demo/demo_data.json" });
          if (response.status === 'succeeded') {
            const demoData = JSON.parse(response.result);
            
            if (demoData && Array.isArray(demoData.events)) {
              loadedEvents = demoData.events.map((evtData: EventDataSource) => {
                // Map demo data structure to Event type
                const eventId = evtData.eventId || evtData.id; // Use eventId from demo, fallback to id
                if (!eventId) {
                    console.error("Demo event data missing id:", evtData);
                    return null; // Skip events without an ID
                }

                // Process shots nested within the event data
                if (Array.isArray(evtData.shots)) {
                    loadedShotsByEventId[eventId] = evtData.shots.map((shotData: ShotRequestDataSource, index) => ({
                        ...shotData,
                        id: shotData.id || `demo_sr_${eventId}_${index}`, // Generate ID if missing
                        eventId: eventId, // Ensure eventId is linked
                        description: shotData.description || "", // Ensure description is string
                        priority: shotData.priority || "Medium", // Default priority
                        status: shotData.status || "Unassigned", // Default status
                    })).filter(shot => shot !== null) as ShotRequest[]; // Filter out any nulls if mapping failed
                } else {
                     loadedShotsByEventId[eventId] = []; // Ensure event has a shots array entry
                }

                const projectForEvent = projects.find(p => p.id === evtData.projectId); // Find project from ProjectContext

                return {
                  id: eventId,
                  name: evtData.name,
                  projectId: evtData.projectId,
                  project: projectForEvent?.name || "Unknown Project",
                  date: evtData.date,
                  time: evtData.time || "", // Default time
                  location: evtData.location || "",
                  status: evtData.status || "Upcoming", // Default status
                  description: evtData.description || "",
                  assignedPersonnelIds: evtData.assignedPersonnelIds || [],
                  isQuickTurnaround: evtData.isQuickTurnaround || false,
                  deadline: evtData.deadline,
                  deliverables: 0, // Assuming deliverables aren't in this demo structure
                  shotRequests: (loadedShotsByEventId[eventId]?.length || 0), // Count shots processed
                  organizationId: evtData.organizationId || projectForEvent?.organizationId || "", // Derive from demo or project
                  discipline: evtData.discipline || "",
                  isCovered: evtData.isCovered === undefined ? true : evtData.isCovered,
                  personnelActivity: evtData.personnelActivity || {},
                  // hasOverlap can be calculated later if needed
                };
              }).filter(event => event !== null) as Event[]; // Filter out any null events
              
            } else {
               console.error("Demo data file does not contain an 'events' array or is empty.");
            }
          } else {
            console.error("Failed to read demo data file:", response.error);
          }
        } catch (error) {
          console.error("Error processing demo data JSON:", error);
        }
      } else {
        // Fetch live data
        try {
          // IMPORTANT: If your Python backend runs on a different port (e.g., 5000)
          // than your Next.js app (e.g., 9002), you'll need a proxy for this fetch.
          // Create a Next.js API route (e.g., /api/events) that forwards to your Python backend.
          // For now, this assumes the fetch will work (e.g., proxy is set up, or same origin).
          const response = await fetch('/api/events'); // Or your actual backend endpoint
          if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.status}`);
          }
          const data: { events: EventDataSource[] } = await response.json(); // Assuming backend returns array under 'events'
          
          data.events.forEach(be => {
             const eventId = String(be.id || be.eventId); // Use backend id or eventId
             if (!eventId) return; // Skip if no ID

            const projectForEvent = projects.find(p => p.id === be.projectId); // Try to find project if projectId is in backend data

            const frontendEvent: Event = {
              id: eventId, 
              name: be.name,
              project: projectForEvent?.name || "Unknown Project", 
              projectId: be.projectId || "unknown_project_id", 
              date: be.date,
              time: be.time || "", 
              priority: be.priority || "Medium", 
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
              id: shotData.id || `live_sr_${eventId}_${index}`, // Generate a unique ID if missing
              eventId: eventId,
               description: shotData.description || "", // Ensure description is string
              priority: shotData.priority || "Medium", // Default priority
              status: shotData.status || "Unassigned", // Default status
            })).filter(shot => shot !== null) as ShotRequest[];
            loadedShotsByEventId[eventId] = shotsForThisEvent;
          });

        } catch (error) {
          console.error("Error fetching live event data:", error);
          // Optionally, set an error state here to show in UI
        }
      }
      
      setAllEventsState(loadedEvents);
      setShotRequestsByEventId(loadedShotsByEventId);
      setIsLoadingEvents(false);
    };
    
    // Re-run effect if useDemoData or selectedProject/projects change after initial load
    // Added projects as dependency because we look up project details here.
    loadData();
  }, [useDemoData, isLoadingSettings, selectedProject, projects]); 


  const addEvent = useCallback((eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> & { organizationId: string }): string => {
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
        // TODO: Implement real API call to add event
    }

    return newEventId;
  }, [projects, useDemoData]); // Added useDemoData dependency

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
            
            // Do not update shotRequests count directly here, it's derived from shotRequestsByEventId state
            // delete updatedEvent.shotRequests; // Or ensure it's not copied from eventData

            return updatedEvent;
        }
        return evt;
      })
    );
    
    if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to update event:", eventId, eventData);
        // TODO: Implement real API call to update event
    }
  }, [projects, useDemoData]); // Added useDemoData dependency

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
        // TODO: Implement real API call to delete event
    }
  }, [useDemoData]); // Added useDemoData dependency

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
      lastStatusModifiedAt: shotData.lastStatusModifiedAt || new Date().toISOString(),
      id: `sr_new_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      eventId: eventId,
    };
    setShotRequestsByEventId(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newShot],
    }));
    // Update event's shotRequests count
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: (shotRequestsByEventId[eventId] ? shotRequestsByEventId[eventId].length + 1 : 1) } : evt
    ));
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to add shot request:", eventId, newShot);
        // TODO: Implement real API call to add shot request
    }

  }, [shotRequestsByEventId, useDemoData]); // Added useDemoData dependency

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
        // TODO: Implement real API call to update shot request
    }
  }, [useDemoData]); // Added useDemoData dependency

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
         // Only delete the event key if it existed and is now empty
        delete updatedShotsByEventId[eventId];
      }
      return updatedShotsByEventId;
    });
    // Update event's shotRequests count
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: newShotRequestsCount } : evt
    ));
     if (!useDemoData) {
        console.warn("Demo data mode is off. Implement actual API call to delete shot request:", eventId, shotId);
        // TODO: Implement real API call to delete shot request
    }
  }, [useDemoData]); // Added useDemoData dependency

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
              // TODO: Implement real API call for check-in
           }
          return updatedEvent;
        }
        return event;
      })
    );
  }, [useDemoData]); // Added useDemoData dependency

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
              // TODO: Implement real API call for check-out
           }
          return updatedEvent;
        }
        return event;
      })
    );
  }, [useDemoData]); // Added useDemoData dependency

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
