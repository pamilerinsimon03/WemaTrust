'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adjustPartnerBankStatus, AdjustPartnerBankStatusInput } from '@/ai/flows/adjust-partner-bank-status';
import { createTransaction, getPartnerBank, updatePartnerBankStatus } from '@/lib/store';

const transferSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  to_account: z.string().min(10, 'Account number must be 10 digits').max(10, 'Account number must be 10 digits'),
  from_bank: z.string().min(1, 'Please select a destination bank'),
  note: z.string().optional(),
});

export async function simulateTransfer(prevState: any, formData: FormData) {
  try {
    const validatedFields = transferSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
      return {
        message: 'Invalid form data',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { amount, to_account, from_bank, note } = validatedFields.data;

    // Simulate transfer logic
    console.log(`[TRANSFER] Initiating transfer of ${amount} to ${to_account} at ${from_bank}`);
    
    createTransaction({
      txn_ref: `WT_DEBIT_${Date.now()}`,
      type: 'debit',
      amount,
      to_account,
      from_bank,
      note,
      status: 'success', // In a real app, this would be pending until confirmed
    });

    console.log(`[SMS STUB] To: User - Your transfer of ${amount} to ${to_account} was successful.`);

    revalidatePath('/'); // Not strictly needed with SSE, but good practice
    return { message: 'Transfer successful!', errors: {} };
  } catch (error) {
    console.error(error);
    return { message: 'An unexpected error occurred.', errors: {} };
  }
}

const partnerStatusSchema = z.object({
  bankId: z.string(),
  networkConditions: z.string(),
  historicalSuccessRate: z.coerce.number().min(0).max(1),
});

export async function updatePartnerStatusAction(formData: FormData) {
  try {
    const validatedFields = partnerStatusSchema.safeParse(
      Object.fromEntries(formData.entries())
    );
    
    if (!validatedFields.success) {
      throw new Error("Invalid form data for partner status update.");
    }
    
    const aiInput: AdjustPartnerBankStatusInput = validatedFields.data;
    const bank = getPartnerBank(aiInput.bankId);
    if (!bank) throw new Error("Bank not found");
    
    console.log(`[GenAI] Calling AI to adjust status for ${bank.name}...`);
    
    const result = await adjustPartnerBankStatus(aiInput);
    
    console.log(`[GenAI] AI result: ${result.newStatus} - ${result.reason}`);
    
    const updatedBank = updatePartnerBankStatus(
      aiInput.bankId, 
      result.newStatus, 
      aiInput.historicalSuccessRate
    );

    if (updatedBank && (updatedBank.status === 'SLOW' || updatedBank.status === 'DOWN')) {
      console.log(`[SMS STUB] To: OpsTeam - Partner bank ${updatedBank.name} is now ${updatedBank.status}. Please investigate.`);
    }
    
    return { success: true, newStatus: result.newStatus, reason: result.reason };

  } catch (error) {
    console.error("Error in updatePartnerStatusAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: errorMessage };
  }
}
