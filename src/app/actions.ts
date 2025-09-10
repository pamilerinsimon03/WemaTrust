'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const transferSchema = z.object({
  userId: z.string().min(1, 'User ID is missing'),
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
    
    const { userId, amount, to_account, note } = validatedFields.data;

    // Call the new transfer API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromUserId: userId,
        toAccountNumber: to_account,
        amount,
        note,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        message: result.error || 'Transfer failed',
        errors: {},
        success: false
      };
    }

    console.log(`[TRANSFER SUCCESS] ${result.message}`);
    console.log(`[BALANCES] Sender: ${result.newBalances.sender.balance}, Recipient: ${result.newBalances.recipient.balance}`);

    revalidatePath('/');
    return { 
      message: result.message, 
      errors: {},
      success: true
    };
  } catch (error) {
    console.error('Transfer Action Error:', error);
    return { message: 'An unexpected error occurred.', errors: {} };
  }
}
