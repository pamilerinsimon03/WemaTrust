'use server';
/**
 * @fileOverview Dynamically adjusts partner bank status based on AI analysis of network conditions and historical data.
 *
 * - adjustPartnerBankStatus - A function that adjusts the status of a partner bank.
 * - AdjustPartnerBankStatusInput - The input type for the adjustPartnerBankStatus function.
 * - AdjustPartnerBankStatusOutput - The return type for the adjustPartnerBankStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustPartnerBankStatusInputSchema = z.object({
  bankId: z.string().describe('The ID of the partner bank.'),
  networkConditions: z
    .string()
    .describe(
      'A description of the current network conditions affecting the bank.'
    ),
  historicalSuccessRate: z
    .number()
    .describe(
      'The historical transaction success rate for the bank (0 to 1).'
    ),
});
export type AdjustPartnerBankStatusInput = z.infer<
  typeof AdjustPartnerBankStatusInputSchema
>;

const AdjustPartnerBankStatusOutputSchema = z.object({
  newStatus: z
    .enum(['UP', 'SLOW', 'DOWN'])
    .describe('The new status of the partner bank.'),
  reason: z
    .string()
    .describe('The reason for the change in partner bank status.'),
});
export type AdjustPartnerBankStatusOutput = z.infer<
  typeof AdjustPartnerBankStatusOutputSchema
>;

export async function adjustPartnerBankStatus(
  input: AdjustPartnerBankStatusInput
): Promise<AdjustPartnerBankStatusOutput> {
  return adjustPartnerBankStatusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustPartnerBankStatusPrompt',
  input: {schema: AdjustPartnerBankStatusInputSchema},
  output: {schema: AdjustPartnerBankStatusOutputSchema},
  prompt: `You are an AI assistant responsible for determining the operational status of partner banks in a financial transaction network.

  Based on the current network conditions and historical transaction success rates provided, determine whether the partner bank's status should be UP, SLOW, or DOWN.

  Consider the following:

  - **UP:** The bank is operating normally with a high transaction success rate and stable network conditions.
  - **SLOW:** The bank is experiencing degraded performance, indicated by a lower transaction success rate or unstable network conditions.
  - **DOWN:** The bank is currently unavailable or experiencing severe issues, indicated by a very low transaction success rate or critical network failures.

  Bank ID: {{{bankId}}}
  Network Conditions: {{{networkConditions}}}
  Historical Success Rate: {{{historicalSuccessRate}}}

  Based on this information, what is the new status of the partner bank, and what is the reason for the change?

  Ensure that the output matches the defined JSON schema. Do not generate any additional text outside of the JSON schema.
  `,
});

const adjustPartnerBankStatusFlow = ai.defineFlow(
  {
    name: 'adjustPartnerBankStatusFlow',
    inputSchema: AdjustPartnerBankStatusInputSchema,
    outputSchema: AdjustPartnerBankStatusOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
