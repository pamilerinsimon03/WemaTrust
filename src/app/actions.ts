'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createTransaction } from '@/lib/store';

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
