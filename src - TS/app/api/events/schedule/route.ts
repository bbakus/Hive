// src/app/api/events/schedule/route.ts
import { NextResponse } from 'next/server';
import { format, addDays, subDays, setHours, setMinutes, startOfDay, endOfDay, parseISO, isValid, isWithinInterval, isAfter, isBefore } from 'date-fns';

// Define the type for event data from the Python backend
type BackendEvent = {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string | null;
  status: string | null;
  description: string | null;
  assignedPersonnelIds: string[];
  isQuickTurnaround: boolean;
  deadline: string | null;
  organizationId: string;
  discipline: string;
  isCovered: boolean;
  personnelActivity: Record<string, any>;
  projectId: string;
  shots: any[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photographerId = searchParams.get('photographerId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  console.log(`GET /api/events/schedule request received. Params: photographerId=${photographerId}, dateFrom=${dateFrom}, dateTo=${dateTo}`);

  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001/events';

  try {
    const response = await fetch(pythonBackendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from Python backend (${pythonBackendUrl}): ${response.status}`, errorBody);
      return NextResponse.json(
        { error: `Failed to fetch events from Python backend: ${response.status} ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data: { events: BackendEvent[] } = await response.json();
    let filteredEvents = data.events;

    // Filter by photographer if specified
    if (photographerId) {
      filteredEvents = filteredEvents.filter(event => 
        event.assignedPersonnelIds?.includes(photographerId)
      );
    }

    // Filter by date range if specified
    if (dateFrom && isValid(parseISO(dateFrom))) {
      const from = startOfDay(parseISO(dateFrom));
      filteredEvents = filteredEvents.filter(event => 
        !isBefore(parseISO(event.date), from)
      );
    }

    if (dateTo && isValid(parseISO(dateTo))) {
      const to = endOfDay(parseISO(dateTo));
      filteredEvents = filteredEvents.filter(event => 
        !isAfter(parseISO(event.date), to)
      );
    }

    // Parse event times for API response
    const parseEventTimesForAPI = (dateStr: string, timeStr: string): { start?: string; end?: string } => {
      if (!dateStr || !timeStr) return {};
      const baseDate = parseISO(dateStr);
      if (!isValid(baseDate)) return {};

      const parts = timeStr.split(' - ');
      if (parts.length !== 2) return {};
      
      const [startTimeStr, endTimeStr] = parts;
      const [startHour, startMinute] = startTimeStr.split(':').map(Number);
      const [endHour, endMinute] = endTimeStr.split(':').map(Number);

      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return {};

      let startDate = setMinutes(setHours(startOfDay(baseDate), startHour), startMinute);
      let endDate = setMinutes(setHours(startOfDay(baseDate), endHour), endMinute);
      
      if (isBefore(endDate, startDate)) { 
        endDate = addDays(endDate, 1);
      }
      return { start: startDate.toISOString(), end: endDate.toISOString() };
    };

    const responseEvents = filteredEvents.map(event => {
      const { start, end } = parseEventTimesForAPI(event.date, event.time);
      return {
        id: event.id,
        name: event.name,
        start: start,
        end: end,
        projectId: event.projectId,
        assignedPhotographerIds: event.assignedPersonnelIds || []
      };
    });

    return NextResponse.json(responseEvents);

  } catch (error) {
    console.error(`Network or other error fetching from Python backend (${pythonBackendUrl}):`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
        { error: 'Failed to connect to the Python backend service.', details: errorMessage },
        { status: 503 }
    );
  }
}
