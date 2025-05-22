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
  location: z.string().describe('The location of the event.'),
  personnel: z.array(z.string()).describe('The team members to include in the schedule.'),
  eventType: z.string().describe('The type of event (e.g., concert, conference, wedding).'),
  additionalCriteria: z.string().optional().describe('Any additional criteria or constraints for the schedule.'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const GenerateScheduleOutputSchema = z.object({
  schedule: z.string().describe('The generated schedule in a human-readable format.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are an AI assistant that generates daily schedules for events.

  Given the following information, create a detailed schedule for each team member:

  Date: {{{date}}}
  Location: {{{location}}}
  Personnel: {{#each personnel}}{{{this}}}, {{/each}}
  Event Type: {{{eventType}}}
  Additional Criteria: {{{additionalCriteria}}}

  Ensure the schedule is optimized for efficient coverage and workload balance.
  The schedule should be easily reviewable and adjustable by a producer.

  Output the schedule in a clear, human-readable format.
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
