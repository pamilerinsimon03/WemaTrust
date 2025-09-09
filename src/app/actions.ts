'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createTransaction, getPartnerBank, processNipEventForUser, findUserByAccountId } from '@/lib/store';
import { PartnerBankStatus } from '@/lib/types';

const transferSchema = z.object({
  userId: z.string().min(1, 'User ID is missing'),
  amount: z.coerce.number().positive('Amount must be positive'),
  to_account: z.string().min(10, 'Account number must be 10 digits').max(10, 'Account number must be 10 digits'),
  from_bank: z.string().min(1, 'Please select a destination bank'),
  note: z.string().optional(),
});

// A function to simulate network delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    
    const { userId, amount, to_account, from_bank, note } = validatedFields.data;

    const recipient = findUserByAccountId(to_account);
    if (!recipient) {
      return { message: 'Recipient account not found.', errors: { to_account: ['Recipient account does not exist.'] } };
    }

    const partnerBank = getPartnerBank(from_bank);
    const bankStatus = partnerBank?.status ?? 'DOWN';

    // --- Create Debit Transaction for Sender ---
    const txn_ref = `WT_${Date.now()}`;
    createTransaction({
      txn_ref: txn_ref,
      type: 'debit',
      amount,
      to_account,
      from_bank,
      note,
      status: 'success', // Debit is successful from our end
      userId: userId,
    });

    console.log(`[TRANSFER] User ${userId} initiated transfer of ${amount} to ${to_account} at ${from_bank} (Status: ${bankStatus})`);
    
    // --- Simulate NIP Flow to Recipient ---
    // 1. Initially Pending
    processNipEventForUser({
        txn_ref,
        amount,
        status: 'pending',
        to_account,
        from_bank: 'WemaTrust',
        note: `From ${userId}`
    });

    // 2. Simulate delay and final status based on bank health
    await sleep(2000); // Simulate network latency

    let finalStatus: 'success' | 'failed' = 'success';
    if (bankStatus === 'DOWN' || (bankStatus === 'SLOW' && Math.random() > 0.5)) {
        finalStatus = 'failed';
    }

    processNipEventForUser({
        txn_ref,
        amount,
        status: finalStatus,
        to_account,
        from_bank: 'WemaTrust',
        note: `From ${userId}`
    });

    console.log(`[SMS STUB] To: ${userId} - Your transfer of ${amount} to ${to_account} was sent successfully.`);

    revalidatePath('/');
    return { message: 'Transfer successful!', errors: {} };
  } catch (error) {
    console.error(error);
    return { message: 'An unexpected error occurred.', errors: {} };
  }
}
