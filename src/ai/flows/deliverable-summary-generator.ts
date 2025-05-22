// src/ai/flows/deliverable-summary-generator.ts
'use server';
/**
 * @fileOverview A deliverable summary generator AI agent.
 *
 * - generateDeliverableSummary - A function that handles the generation of a deliverable summary.
 * - DeliverableSummaryInput - The input type for the generateDeliverableSummary function.
 * - DeliverableSummaryOutput - The return type for the generateDeliverableSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DeliverableSummaryInputSchema = z.object({
  eventOrProjectName: z.string().describe('The name of the event or project to summarize deliverables for.'),
  deliverablesData: z.string().describe('JSON formatted data of deliverables, their statuses, and due dates.'),
});
export type DeliverableSummaryInput = z.infer<typeof DeliverableSummaryInputSchema>;

const DeliverableSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the deliverables statuses.'),
  progress: z.string().describe('A short, one-sentence summary of the progress.'),
});
export type DeliverableSummaryOutput = z.infer<typeof DeliverableSummaryOutputSchema>;

export async function generateDeliverableSummary(input: DeliverableSummaryInput): Promise<DeliverableSummaryOutput> {
  return generateDeliverableSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'deliverableSummaryPrompt',
  input: {schema: DeliverableSummaryInputSchema},
  output: {schema: DeliverableSummaryOutputSchema},
  prompt: `You are a project manager tasked with summarizing the status of deliverables for a given event or project.

  Based on the deliverables data provided, generate a concise summary of the current status, highlighting any potential bottlenecks or delays.

  Event/Project Name: {{{eventOrProjectName}}}
  Deliverables Data: {{{deliverablesData}}}

  Summary: `,
});

const generateDeliverableSummaryFlow = ai.defineFlow(
  {
    name: 'generateDeliverableSummaryFlow',
    inputSchema: DeliverableSummaryInputSchema,
    outputSchema: DeliverableSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      ...output!,
      progress: 'Generated a concise summary of deliverables status for the given event or project.',
    };
  }
);
