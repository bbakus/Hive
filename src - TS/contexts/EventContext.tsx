
"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useProjectContext } from './ProjectContext';

export interface Event {
  id: string;
  name: string;
  date: string;
  time?: string;
  location?: string;
  status?: string;
  priority?: 'High' | 'Medium' | 'Low';
  assignedPersonnelIds?: string[];
  isQuickTurnaround?: boolean;
  deadline?: string;
  organizationId?: string;
  discipline?: "Photography" | "";
  isCovered?: boolean;
  notes?: string;
  projectId: string;
  shots?: ShotRequest[];
}

export interface ShotRequest {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  priority?: 'High' | 'Medium' | 'Low';
  eventId?: string;
  assignedPersonnelId?: string;
  notes?: string;
}

interface EventContextType {
  events: Event[];
  shotRequestsByEventId: Record<string, ShotRequest[]>;
  addEvent: (newEvent: Omit<Event, 'id'>) => Promise<void>;
  updateEvent: (eventId: string, updatedEvent: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addShotRequest: (eventId: string, newShot: Omit<ShotRequest, 'id' | 'eventId'>) => void;
  updateShotRequest: (eventId: string, shotId: string, updatedData: Partial<ShotRequest>) => void;
  deleteShotRequest: (eventId: string, shotId: string) => void;
  checkInPersonnel: (eventId: string, personnelId: string) => void;
  checkOutPersonnel: (eventId: string, personnelId: string) => void;
  isLoadingEvents: boolean;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const { projects } = useProjectContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [shotRequestsByEventId, setShotRequestsByEventId] = useState<Record<string, ShotRequest[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoadingEvents(true);
      const response = await fetch('/api/events');
      if (response.ok) {
        const eventsData = await response.json();
        setEvents(eventsData);
      } else {
        console.error('Failed to fetch events:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(async (newEvent: Omit<Event, 'id'>) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      
      if (response.ok) {
        const createdEvent = await response.json();
        setEvents(prev => [...prev, createdEvent]);
      } else {
        console.error('Failed to add event:', response.statusText);
      }
    } catch (error) {
      console.error('Error adding event:', error);
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, updatedEvent: Partial<Event>) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setEvents(prev => prev.map(event => event.id === eventId ? { ...event, ...updated } : event));
      } else {
        console.error('Failed to update event:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
      } else {
        console.error('Failed to delete event:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }, []);

  const addShotRequest = useCallback((eventId: string, newShot: Omit<ShotRequest, 'id' | 'eventId'>) => {
    const shotWithId: ShotRequest = {
      ...newShot,
      id: `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
    };
    
    setShotRequestsByEventId(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), shotWithId]
    }));
    
    // TODO: Make API call to save shot request
    console.log('Shot request added (TODO: implement API call):', shotWithId);
  }, []);

  const updateShotRequest = useCallback((eventId: string, shotId: string, updatedData: Partial<ShotRequest>) => {
    setShotRequestsByEventId(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || []).map(shot => 
        shot.id === shotId ? { ...shot, ...updatedData } : shot
      )
    }));
    
    // TODO: Make API call to update shot request
    console.log('Shot request updated (TODO: implement API call):', { eventId, shotId, updatedData });
  }, []);

  const deleteShotRequest = useCallback((eventId: string, shotId: string) => {
    setShotRequestsByEventId(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || []).filter(shot => shot.id !== shotId)
    }));
    
    // TODO: Make API call to delete shot request
    console.log('Shot request deleted (TODO: implement API call):', { eventId, shotId });
  }, []);

  const checkInPersonnel = useCallback((eventId: string, personnelId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, assignedPersonnelIds: [...(event.assignedPersonnelIds || []), personnelId] }
        : event
    ));
    
    // TODO: Make API call to check in personnel
    console.log('Personnel checked in (TODO: implement API call):', { eventId, personnelId });
  }, []);

  const checkOutPersonnel = useCallback((eventId: string, personnelId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, assignedPersonnelIds: (event.assignedPersonnelIds || []).filter(id => id !== personnelId) }
        : event
    ));
    
    // TODO: Make API call to check out personnel
    console.log('Personnel checked out (TODO: implement API call):', { eventId, personnelId });
  }, []);

  const value = useMemo(() => ({
    events,
    shotRequestsByEventId,
    addEvent,
    updateEvent,
    deleteEvent,
    addShotRequest,
    updateShotRequest,
    deleteShotRequest,
    checkInPersonnel,
    checkOutPersonnel,
    isLoadingEvents,
  }), [
    events,
    shotRequestsByEventId,
    addEvent,
    updateEvent,
    deleteEvent,
    addShotRequest,
    updateShotRequest,
    deleteShotRequest,
    checkInPersonnel,
    checkOutPersonnel,
    isLoadingEvents,
  ]);

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
}
