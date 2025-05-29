// src/app/api/events/schedule/route.ts
import { NextResponse } from 'next/server';
import { format, addDays, subDays, setHours, setMinutes, startOfDay, endOfDay, parseISO, isValid, isWithinInterval, isAfter, isBefore } from 'date-fns';
import type { Event } from '@/contexts/EventContext'; // Assuming Event type is similar enough

// This would typically come from a database or EventContext (if context could be accessed server-side directly)
// For this placeholder, we'll generate dynamic mock data similar to EventContext
const generateMockEvents = (): Event[] => {
  const events: Event[] = [];
  const today = new Date();
  const photographers = ["user001", "user002", "user004", "user006"];
  const projectIds = ["proj_g9e_summit_2024"]; // Assume one project for simplicity here

  // Create events for yesterday, today, tomorrow, day after tomorrow
  for (let dayOffset = -1; dayOffset <= 2; dayOffset++) {
    const currentDate = addDays(today, dayOffset);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    photographers.forEach((photogId, pIndex) => {
      const eventBaseId = `demo_evt_${dateStr.replace(/-/g, '')}_${photogId}_`;
      
      // Morning Session
      events.push({
        id: `${eventBaseId}morn_${pIndex}`,
        name: `Morning Coverage ${pIndex + 1} - ${photogId}`,
        projectId: projectIds[0],
        project: "G9e Annual Summit 2024",
        date: dateStr,
        time: "09:00 - 12:00",
        priority: "High",
        assignedPersonnelIds: [photogId],
        shotRequests: 5, // Placeholder
        deliverables: 2,  // Placeholder
        isCovered: true,
        personnelActivity: {},
        organizationId: "org_g9e",
        discipline: "Photography"
      });

      // Afternoon Session
      events.push({
        id: `${eventBaseId}aft_${pIndex}`,
        name: `Afternoon Shoot ${pIndex + 1} - ${photogId}`,
        projectId: projectIds[0],
        project: "G9e Annual Summit 2024",
        date: dateStr,
        time: "14:00 - 17:00",
        priority: "Medium",
        assignedPersonnelIds: [photogId],
        shotRequests: 4, // Placeholder
        deliverables: 1,  // Placeholder
        isCovered: true,
        personnelActivity: {},
        organizationId: "org_g9e",
        discipline: "Photography"
      });
    });
  }
  return events;
};

const mockEventsSchedule: Event[] = generateMockEvents();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photographerId = searchParams.get('photographerId');
  const dateFrom = searchParams.get('dateFrom'); // Expected ISO date string
  const dateTo = searchParams.get('dateTo');     // Expected ISO date string

  console.log(`GET /api/events/schedule request received. Params: photographerId=${photographerId}, dateFrom=${dateFrom}, dateTo=${dateTo}`);

  // TODO: Implement authentication and authorization checks
  // TODO: Fetch actual events from a database based on query parameters

  let filteredEvents = mockEventsSchedule;

  if (photographerId) {
    filteredEvents = filteredEvents.filter(event => event.assignedPersonnelIds?.includes(photographerId));
  }

  if (dateFrom && isValid(parseISO(dateFrom))) {
    const from = startOfDay(parseISO(dateFrom));
    filteredEvents = filteredEvents.filter(event => !isBefore(parseISO(event.date), from));
  }

  if (dateTo && isValid(parseISO(dateTo))) {
    const to = endOfDay(parseISO(dateTo));
    filteredEvents = filteredEvents.filter(event => !isAfter(parseISO(event.date), to));
  }
  
  // Map to the structure expected by the local utility if it's different
  // For now, assuming HIVE's Event type is sufficient or the utility adapts.
  // The local utility specifically asked for "start" and "end" as ISO8601 for events.
  // HIVE's Event type has 'date' (YYYY-MM-DD) and 'time' (HH:MM - HH:MM).
  // Let's try to derive start/end ISO strings for the response.

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
        // Include other relevant fields utility might need, e.g., projectId
        projectId: event.projectId,
        assignedPhotographerIds: event.assignedPersonnelIds || [] // Ensure it's an array
    };
  });


  return NextResponse.json(responseEvents);
}
