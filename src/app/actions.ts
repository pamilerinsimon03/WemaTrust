'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { dbOperations as serverDbOperations } from '@/lib/server-database';

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

    console.log('[TRANSFER ACTION] Using server database directly');

    // Get sender user and account
    const sender = serverDbOperations.getUser(userId);
    if (!sender || !sender.accountId) {
      return { message: 'Sender account not found.', errors: { userId: ['Sender account does not exist.'] } };
    }

    const senderAccount = serverDbOperations.getAccount(sender.accountId);
    if (!senderAccount) {
      return { message: 'Sender account not found.', errors: { userId: ['Sender account does not exist.'] } };
    }

    // Find recipient user by account number
    const recipient = serverDbOperations.findUserByAccountNumber(to_account);
    if (!recipient || !recipient.accountId) {
      return { message: 'Recipient account not found.', errors: { to_account: ['Recipient account does not exist.'] } };
    }

    const recipientAccount = serverDbOperations.getAccount(recipient.accountId);
    if (!recipientAccount) {
      return { message: 'Recipient account not found.', errors: { to_account: ['Recipient account does not exist.'] } };
    }

    // Check if sender has sufficient balance
    if (senderAccount.balance < amount) {
      return { message: 'Insufficient balance.', errors: { amount: ['You do not have sufficient balance for this transfer.'] } };
    }

    // Generate transaction reference
    const txnRef = `WT_${Date.now()}`;

    // Create debit transaction for sender
    const debitTransaction = serverDbOperations.createTransaction({
      userId: userId,
      txn_ref: txnRef,
      type: 'debit',
      amount,
      to_account: to_account,
      from_bank: 'WemaTrust',
      note: note || `Transfer to ${to_account}`,
      status: 'success',
    });

    // Create credit transaction for recipient
    const creditTransaction = serverDbOperations.createTransaction({
      userId: recipient.id,
      txn_ref: txnRef,
      type: 'credit',
      amount,
      from_bank: 'WemaTrust',
      note: note || `Transfer from ${senderAccount.accountNumber}`,
      status: 'success',
    });

    // Update balances
    const newSenderBalance = senderAccount.balance - amount;
    const newRecipientBalance = recipientAccount.balance + amount;

    serverDbOperations.updateAccountBalance(senderAccount.id, newSenderBalance);
    serverDbOperations.updateAccountBalance(recipientAccount.id, newRecipientBalance);

    console.log(`[TRANSFER] ${sender.name} transferred ${amount} to ${recipient.name}`);
    console.log(`[BALANCE] ${sender.name}: ${newSenderBalance}, ${recipient.name}: ${newRecipientBalance}`);

    // Verify the changes were applied
    const updatedSenderAccount = serverDbOperations.getAccount(senderAccount.id);
    const updatedRecipientAccount = serverDbOperations.getAccount(recipientAccount.id);
    console.log(`[VERIFY] Updated sender balance: ${updatedSenderAccount?.balance}`);
    console.log(`[VERIFY] Updated recipient balance: ${updatedRecipientAccount?.balance}`);

    revalidatePath('/');
    return { 
      message: `Transfer of ₦${amount.toLocaleString()} to ${to_account} was successful!`, 
      errors: {},
      success: true
    };
  } catch (error) {
    console.error('Transfer Action Error:', error);
    return { message: 'An unexpected error occurred.', errors: {} };
  }
}
