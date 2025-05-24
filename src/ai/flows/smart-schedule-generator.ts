
// SmartScheduleGenerator flow

'use server';

/**
 * @fileOverview Generates a draft daily schedule for team members based on specific criteria.
 *
 * - generateSchedule - A function that generates a schedule based on input criteria.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScheduleInputSchema = z.object({
  date: z.string().describe('The date for which to generate the schedule (YYYY-MM-DD).'),
  location: z.string().optional().describe('The specific venue or area of the event, if it has scheduling implications (e.g., "Main Stage", "Hall A", "Outdoor Area").'),
  personnel: z.array(z.string()).describe('The team members to include in the schedule.'),
  eventType: z.string().optional().describe('The type of event (e.g., concert, conference, wedding, photoshoot). This helps determine typical activities and phases.'),
  additionalCriteria: z.string().optional().describe('Crucial constraints, preferences, or specific tasks that must be included or considered (e.g., "Alice needs a 1-hour break around 1pm", "Focus on capturing X specific moment").'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const GenerateScheduleOutputSchema = z.object({
  schedule: z.string().describe('The generated schedule in a human-readable format, detailing tasks and timings for each listed personnel member.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are an AI assistant that generates detailed daily schedules for events.

  Your primary goal is to create an optimized schedule for each listed team member based on the provided information. Ensure efficient coverage and balanced workloads. The schedule should be easily reviewable and adjustable by a producer.

  Key Information:
  Date: {{{date}}}
  Personnel: {{#each personnel}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if eventType}}
  Event Type: {{{eventType}}}. Tailor the schedule considering typical activities, phases (e.g., setup, main event, teardown), and personnel roles common to this type of event.
  {{/if}}

  {{#if location}}
  Event Location: {{{location}}}. Consider any logistical implications or specific needs related to this location in your scheduling.
  {{/if}}

  {{#if additionalCriteria}}
  Crucial Constraints and Preferences: {{{additionalCriteria}}}. Adhere to these specific instructions strictly. These are high-priority requirements.
  {{else}}
  No additional specific criteria provided beyond general event type considerations.
  {{/if}}

  Output the schedule in a clear, human-readable format. For each person, list their tasks with specific start and end times (e.g., 09:00 - 10:30: Task Description).
  Organize the output by personnel member. For example:
  
  Alice:
  09:00 - 11:00: Venue Setup at Main Stage
  11:00 - 12:00: Equipment Check
  12:00 - 13:00: Lunch Break
  ...

  Bob:
  10:00 - 12:00: Client Meeting
  ...

  Ensure all listed personnel are included in the schedule.
  `,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

