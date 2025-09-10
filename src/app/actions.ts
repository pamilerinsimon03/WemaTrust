'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { dbOperations } from '@/lib/database';

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

    // Get sender user and account
    const sender = dbOperations.getUser(userId);
    if (!sender || !sender.accountId) {
      return { message: 'Sender account not found.', errors: { userId: ['Sender account does not exist.'] } };
    }

    const senderAccount = dbOperations.getAccount(sender.accountId);
    if (!senderAccount) {
      return { message: 'Sender account not found.', errors: { userId: ['Sender account does not exist.'] } };
    }

    // Find recipient user by account number
    const recipient = dbOperations.findUserByAccountNumber(to_account);
    if (!recipient || !recipient.accountId) {
      return { message: 'Recipient account not found.', errors: { to_account: ['Recipient account does not exist.'] } };
    }

    const recipientAccount = dbOperations.getAccount(recipient.accountId);
    if (!recipientAccount) {
      return { message: 'Recipient account not found.', errors: { to_account: ['Recipient account does not exist.'] } };
    }

    // Check if sender has sufficient balance
    if (senderAccount.balance < amount) {
      return { message: 'Insufficient balance.', errors: { amount: ['You do not have sufficient balance for this transfer.'] } };
    }

    // Generate transaction reference
    const txnRef = `WT_${Date.now()}`;

    // Determine transfer type and handle accordingly
    const isWemaToWema = true; // Both accounts are Wema accounts
    const recipientBankId = 'bank_a'; // Assume Zenith for demo
    
    let prefundedAccountUsed: string | undefined;
    let prefundedAccountBalance: number | undefined;

    // For Wema-to-Other transfers, check and use prefunded account
    if (!isWemaToWema) {
      const prefundedAccounts = dbOperations.getAllPrefundedAccounts();
      const availableAccount = prefundedAccounts.find(
        acc => acc.bankId === recipientBankId && acc.status === 'ACTIVE' && acc.balance >= amount
      );
      
      if (availableAccount) {
        // Deduct from prefunded account
        dbOperations.updatePrefundedAccountBalance(availableAccount.id, availableAccount.balance - amount);
        prefundedAccountUsed = availableAccount.id;
        prefundedAccountBalance = availableAccount.balance - amount;
      }
    }

    // Create debit transaction for sender (instant)
    const debitTransaction = dbOperations.createTransaction({
      userId: userId,
      txn_ref: txnRef,
      type: 'debit',
      amount,
      to_account,
      from_bank: 'WemaTrust',
      note: note || `Transfer to ${to_account}`,
      status: 'success',
    });

    // Create credit transaction for recipient (instant)
    const creditTransaction = dbOperations.createTransaction({
      userId: recipient.id,
      txn_ref: txnRef,
      type: 'credit',
      amount,
      from_bank: 'WemaTrust',
      note: note || `Transfer from ${senderAccount.accountNumber}`,
      status: 'success',
    });

    // Update balances instantly
    const newSenderBalance = senderAccount.balance - amount;
    const newRecipientBalance = recipientAccount.balance + amount;

    dbOperations.updateAccountBalance(senderAccount.id, newSenderBalance);
    dbOperations.updateAccountBalance(recipientAccount.id, newRecipientBalance);

    // Create transfer log to track the instant credit and backend settlement
    const transferLog = dbOperations.createTransferLog({
      transactionId: txnRef,
      senderUserId: userId,
      senderName: sender.name,
      senderAccount: senderAccount.accountNumber,
      recipientUserId: recipient.id,
      recipientName: recipient.name,
      recipientAccount: recipientAccount.accountNumber,
      recipientBank: isWemaToWema ? 'WemaTrust' : recipientBankId,
      amount,
      transferType: isWemaToWema ? 'WEMA_TO_WEMA' : 'WEMA_TO_OTHER',
      instantStatus: 'CREDITED',
      backendStatus: 'PENDING',
      prefundedAccountUsed,
      prefundedAccountBalance,
      notes: `Instant transfer - ${isWemaToWema ? 'Internal ledger' : 'Prefunded account used'}`,
    });

    console.log(`[INSTANT TRANSFER] ${sender.name} -> ${recipient.name}: ₦${amount.toLocaleString()}`);
    console.log(`[BALANCE UPDATE] ${sender.name}: ₦${newSenderBalance.toLocaleString()}, ${recipient.name}: ₦${newRecipientBalance.toLocaleString()}`);
    console.log(`[TRANSFER LOG] Created log ID: ${transferLog.id}, Status: CREDITED/PENDING`);

    // Simulate backend settlement (in real system, this would be async)
    setTimeout(() => {
      const settlementRef = `STL_${Date.now()}`;
      dbOperations.updateTransferLogBackendStatus(transferLog.id, 'SETTLED', settlementRef);
      console.log(`[BACKEND SETTLEMENT] Transfer ${txnRef} settled with reference ${settlementRef}`);
    }, 3000); // Simulate 3-second settlement

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
