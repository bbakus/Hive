
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
export type Event = EventTypeDefinition & {
   personnelActivity?: Record<string, { checkInTime?: string; checkOutTime?: string }>;
   organizationId?: string;
   discipline?: "Photography" | "";
};

const CULINARY_PROJECT_ID = "proj_pb_culinary_classic_2025";
const CULINARY_ORG_ID = "org_g9e";

const CULINARY_PHOTOGRAPHERS_IDS = ["user_maria_s", "user_david_l", "user_sophia_c", "user_james_b"];
const CULINARY_SUPPORT_STAFF_IDS = ["user_liam_w", "user_ava_m", "user_event_lead_ops"];

const generateCulinaryClassicEventsAndShots = (): { events: Event[], shotsByEventId: Record<string, ShotRequest[]> } => {
  const culinaryEvents: Event[] = [];
  const shotsByEventId: Record<string, ShotRequest[]> = {};
  let eventIdCounter = 1000;
  let shotIdCounter = 5000;

  const eventDates = ["2025-05-16", "2025-05-17", "2025-05-18"]; // Fri, Sat, Sun

  const eventTemplates = [
    { namePrefix: "Grand Opening Breakfast", time: "08:00 - 10:00", priority: "High", photographers: 2, shots: 5, quickTurn: true, deadlineOffset: 12, discipline: "Photography"},
    { namePrefix: "Celebrity Chef Demo:", time: "10:30 - 12:00", priority: "Critical", photographers: 1, shots: 7, quickTurn: true, deadlineOffset: 15, discipline: "Photography"},
    { namePrefix: "Wine Pairing Luncheon", time: "12:30 - 14:00", priority: "High", photographers: 2, shots: 6, discipline: "Photography"},
    { namePrefix: "Artisan Food Fair Roaming", time: "14:00 - 17:00", priority: "Medium", photographers: 1, shots: 4, discipline: "Photography"},
    { namePrefix: "Masterclass:", time: "15:00 - 16:30", priority: "Medium", photographers: 1, shots: 5, discipline: "Photography"},
    { namePrefix: "VIP Welcome Reception", time: "18:00 - 20:00", priority: "Critical", photographers: 2, shots: 7, quickTurn: true, deadlineOffset: 22, discipline: "Photography"},
    { namePrefix: "Sunset Beach BBQ", time: "19:00 - 21:30", priority: "High", photographers: 1, shots: 6, discipline: "Photography"},
    { namePrefix: "Gourmet Gala Dinner", time: "20:00 - 23:00", priority: "Critical", photographers: 2, shots: 7, discipline: "Photography"},
    { namePrefix: "Morning Yoga & Mimosas", time: "07:00 - 08:30", priority: "Low", photographers: 1, shots: 3, discipline: "Photography"},
    { namePrefix: "Farm-to-Table Brunch", time: "11:00 - 13:00", priority: "High", photographers: 2, shots: 5, discipline: "Photography"},
    { namePrefix: "Book Signing:", time: "14:30 - 15:30", priority: "Medium", photographers: 1, shots: 3, discipline: "Photography"},
    { namePrefix: "Mixology Challenge Finale", time: "16:00 - 17:30", priority: "High", photographers: 1, shots: 6, quickTurn: true, deadlineOffset: 19, discipline: "Photography"},
    { namePrefix: "Silent Auction Viewing", time: "17:00 - 18:30", priority: "Low", photographers: 1, shots: 3, discipline: "Photography"},
    { namePrefix: "Closing Awards Ceremony", time: "19:30 - 21:00", priority: "Critical", photographers: 2, shots: 7, quickTurn: true, deadlineOffset: 23, discipline: "Photography"},
    { namePrefix: "Beachside Taco Fiesta", time: "13:00 - 15:00", priority: "Medium", photographers: 1, shots: 4, discipline: "Photography"},
  ];
  
  const celebrityChefs = ["Gordon Ramsay", "Massimo Bottura", "Dominique Crenn", "José Andrés", "Clare Smyth"];
  const masterclassTopics = ["Sourdough Secrets", "Advanced Pastry Techniques", "Sustainable Seafood", "The Art of Plating", "Molecular Gastronomy 101"];
  const winePairingRegions = ["Napa Valley Reds", "Burgundy Whites", "Italian Sparkling", "New Zealand Sauvignon Blanc", "Rhône Valley Syrah"];

  const shotTitleTemplates = ["Overall Ambiance", "Key Speaker Close-up", "Guest Interaction", "Food Presentation Detail", "Branding & Signage", "Candid Moments", "Wide Shot of Venue Setup"];
  const shotDescriptionTemplates = [
    "Capture the overall atmosphere and decor.", "Tight shots of the main personality speaking.", "Guests mingling and enjoying the event.",
    "Detailed shots of the food and its presentation.", "Photos of event branding, logos, and signage.", "Spontaneous, unposed moments of guests and staff.",
    "A comprehensive wide shot showing the entire event space and setup."
  ];
  const shotPriorities: ShotRequest['priority'][] = ["High", "Medium", "Critical", "Low"];
  const shotStatuses: ShotRequest['status'][] = ["Unassigned", "Assigned", "Captured", "Blocked", "Request More", "Completed"];

  const createShotsForEvent = (eventId: string, eventNameForShot: string, numShots: number, assignedPersonnelIds: string[], eventDateStr: string) => {
    if (!shotsByEventId[eventId]) {
      shotsByEventId[eventId] = [];
    }
    for (let i = 0; i < numShots; i++) {
      const shotStatus = shotStatuses[(shotIdCounter + i + eventIdCounter) % shotStatuses.length];
      let initialCapturerId: string | undefined;
      let lastStatusModifierId: string | undefined;
      let lastStatusModifiedAt: string | undefined;
      let currentAssignedPersonnelId: string | undefined;

      const mainPhotographer = assignedPersonnelIds.length > 0 ? assignedPersonnelIds[i % assignedPersonnelIds.length] : CULINARY_PHOTOGRAPHERS_IDS[i % CULINARY_PHOTOGRAPHERS_IDS.length];
      const supportStaffMember = CULINARY_SUPPORT_STAFF_IDS[i % CULINARY_SUPPORT_STAFF_IDS.length];

      if (shotStatus === "Captured" || shotStatus === "Completed") {
        initialCapturerId = mainPhotographer;
        lastStatusModifierId = mainPhotographer;
        lastStatusModifiedAt = subDays(parseISO(eventDateStr), Math.random() < 0.5 ? 0 : 1).toISOString(); // Captured on event day or day before
      } else if (shotStatus === "Blocked") {
        lastStatusModifierId = supportStaffMember;
         lastStatusModifiedAt = subDays(parseISO(eventDateStr), Math.random() < 0.5 ? 0 : 1).toISOString();
      } else if (shotStatus === "Assigned" || shotStatus === "Request More") {
        currentAssignedPersonnelId = mainPhotographer;
        lastStatusModifierId = supportStaffMember;
        lastStatusModifiedAt = subDays(parseISO(eventDateStr), Math.random() < 0.5 ? 0 : 1).toISOString();
      }
      
      shotsByEventId[eventId].push({
        id: `pbcc_sr_${shotIdCounter++}`, eventId: eventId,
        title: `${shotTitleTemplates[(shotIdCounter + i) % shotTitleTemplates.length]} - ${eventNameForShot.substring(0,15)}`,
        description: `${shotDescriptionTemplates[(shotIdCounter + i) % shotDescriptionTemplates.length]} for ${eventNameForShot}.`,
        priority: shotPriorities[(i + eventIdCounter) % shotPriorities.length], status: shotStatus,
        assignedPersonnelId: currentAssignedPersonnelId,
        initialCapturerId: initialCapturerId,
        lastStatusModifierId: lastStatusModifierId,
        lastStatusModifiedAt: lastStatusModifiedAt,
        blockedReason: shotStatus === "Blocked" ? "Equipment issue (mock)" : undefined,
        notes: shotStatus === "Request More" ? "Client requested more angles." : (Math.random() < 0.3 ? "Standard setup." : undefined),
      });
    }
  };
  
  let photographerRotationIndex = 0;
  eventDates.forEach((dateStr, dayIdx) => {
    let eventCountForDay = 0;
    const dailyEvents = []; // To help assign photographers somewhat evenly

    // Create ~10-12 events for the day
    while(eventCountForDay < (10 + dayIdx) && eventCountForDay < eventTemplates.length) { // up to 10, 11, 12 events
        const templateIndex = (eventIdCounter + dayIdx * 10 + eventCountForDay) % eventTemplates.length;
        const template = eventTemplates[templateIndex];
        let eventName = template.namePrefix;
        if (template.namePrefix.endsWith(":")) {
            if (template.namePrefix.includes("Chef Demo")) eventName += ` ${celebrityChefs[(eventIdCounter + eventCountForDay) % celebrityChefs.length]}`;
            else if (template.namePrefix.includes("Masterclass")) eventName += ` ${masterclassTopics[(eventIdCounter + eventCountForDay) % masterclassTopics.length]}`;
            else if (template.namePrefix.includes("Book Signing")) eventName += ` ${celebrityChefs[(eventIdCounter + eventCountForDay + 1) % celebrityChefs.length]}`;
        } else if (template.namePrefix.includes("Wine Pairing")) {
             eventName = `${winePairingRegions[(eventIdCounter + eventCountForDay) % winePairingRegions.length]} ${template.namePrefix}`;
        }
        
        const eventId = `pbcc_evt_${eventIdCounter++}`;
        const assignedPhotographers: string[] = [];
        for(let i=0; i<template.photographers; i++) {
            assignedPhotographers.push(CULINARY_PHOTOGRAPHERS_IDS[(photographerRotationIndex + i) % CULINARY_PHOTOGRAPHERS_IDS.length]);
        }
        photographerRotationIndex = (photographerRotationIndex + template.photographers) % CULINARY_PHOTOGRAPHERS_IDS.length;

        const personnelActivity: Event['personnelActivity'] = {};
        if (dayIdx <= 1) { // Only for yesterday and today
            assignedPhotographers.forEach(pId => {
                if (Math.random() < 0.7) { // 70% chance to have activity
                    const eventStartTime = parseISO(`${dateStr}T${template.time.split(" - ")[0]}:00`);
                    const checkInTime = subHours(eventStartTime, Math.random() * 0.5); // Check-in up to 30 mins before
                    personnelActivity[pId] = { checkInTime: checkInTime.toISOString() };
                    if (dayIdx === 0 || (dayIdx === 1 && isBefore(eventStartTime, subHours(new Date(), 2)) ) ) { // If yesterday, or today but event ended 2hrs ago
                        const eventEndTime = parseISO(`${dateStr}T${template.time.split(" - ")[1]}:00`);
                        personnelActivity[pId]!.checkOutTime = addHours(eventEndTime, Math.random() * 0.5).toISOString();
                    }
                }
            });
        }

        culinaryEvents.push({
            id: eventId, name: eventName,
            projectId: CULINARY_PROJECT_ID, project: "Pebble Beach Culinary Classic 2025",
            date: dateStr, time: template.time, priority: template.priority as Event['priority'],
            assignedPersonnelIds: [...assignedPhotographers, CULINARY_SUPPORT_STAFF_IDS[dayIdx % CULINARY_SUPPORT_STAFF_IDS.length]], // Add one support staff
            isQuickTurnaround: template.quickTurn,
            deadline: template.quickTurn ? `${dateStr}T${String(template.deadlineOffset).padStart(2, '0')}:00:00Z` : undefined,
            deliverables: 0, shotRequests: 0, // Will be updated after shots are created
            organizationId: CULINARY_ORG_ID,
            discipline: template.discipline as Event['discipline'],
            isCovered: true,
            personnelActivity: personnelActivity,
        });
        createShotsForEvent(eventId, eventName, template.shots, assignedPhotographers, dateStr);
        eventCountForDay++;
    }
  });
  
  culinaryEvents.forEach(event => {
    event.shotRequests = shotsByEventId[event.id]?.length || 0;
  });

  return { events: culinaryEvents, shotsByEventId };
};


type EventContextType = {
  allEvents: Event[];
  eventsForSelectedProjectAndOrg: Event[];
  addEvent: (eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> & { organizationId: string }) => string;
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
        const { events: culinaryClassicEvents, shotsByEventId: culinaryClassicShots } = generateCulinaryClassicEventsAndShots();
        setAllEventsState(culinaryClassicEvents);
        setShotRequestsByEventId(culinaryClassicShots);
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

  const addEvent = useCallback((eventData: Omit<Event, 'id' | 'deliverables' | 'shotRequests' | 'project' | 'hasOverlap' | 'personnelActivity'> & { organizationId: string }): string => {
    const projectForEvent = projects.find(p => p.id === eventData.projectId);
    const newEventId = `evt_new_${Date.now()}`;
    setAllEventsState((prevEvents) => {
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
      return [...prevEvents, newEvent];
    });
    setShotRequestsByEventId(prev => ({ ...prev, [newEventId]: [] }));
    return newEventId;
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
    setAllEventsState(prevEvents => prevEvents.map(evt =>
      evt.id === eventId ? { ...evt, shotRequests: (shotRequestsByEventId[eventId] ? shotRequestsByEventId[eventId].length + 1 : 1) } : evt
    ));
  }, [shotRequestsByEventId]);

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
  }, []);

  const deleteShotRequest = useCallback((eventId: string, shotId: string) => {
    let newShotRequestsCount = 0;
    setShotRequestsByEventId(prev => {
      const eventShots = prev[eventId] || [];
      const updatedShots = eventShots.filter(shot => shot.id !== shotId);
      newShotRequestsCount = updatedShots.length;
      if (updatedShots.length === 0 && prev[eventId]) { 
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

    