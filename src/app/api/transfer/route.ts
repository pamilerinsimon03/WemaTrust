import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbOperations } from '@/lib/database';

const transferSchema = z.object({
  fromUserId: z.string().min(1, 'From user ID is required'),
  toAccountNumber: z.string().length(10, 'Account number must be 10 digits'),
  amount: z.coerce.number().positive('Amount must be positive'),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = transferSchema.parse(body);
    
    const { fromUserId, toAccountNumber, amount, note } = validatedData;

    // Get sender user and account
    const sender = dbOperations.getUser(fromUserId);
    if (!sender || !sender.accountId) {
      return NextResponse.json({ error: 'Sender account not found' }, { status: 404 });
    }

    const senderAccount = dbOperations.getAccount(sender.accountId);
    if (!senderAccount) {
      return NextResponse.json({ error: 'Sender account not found' }, { status: 404 });
    }

    // Find recipient user by account number
    const recipient = dbOperations.findUserByAccountNumber(toAccountNumber);
    if (!recipient || !recipient.accountId) {
      return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 });
    }

    const recipientAccount = dbOperations.getAccount(recipient.accountId);
    if (!recipientAccount) {
      return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 });
    }

    // Check if sender has sufficient balance
    if (senderAccount.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Generate transaction reference
    const txnRef = `WT_${Date.now()}`;

    // Create debit transaction for sender
    const debitTransaction = dbOperations.createTransaction({
      userId: fromUserId,
      txn_ref: txnRef,
      type: 'debit',
      amount,
      to_account: toAccountNumber,
      from_bank: 'WemaTrust',
      note: note || `Transfer to ${toAccountNumber}`,
      status: 'success',
    });

    // Create credit transaction for recipient
    const creditTransaction = dbOperations.createTransaction({
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

    dbOperations.updateAccountBalance(senderAccount.id, newSenderBalance);
    dbOperations.updateAccountBalance(recipientAccount.id, newRecipientBalance);

    console.log(`[TRANSFER] ${sender.name} transferred ${amount} to ${recipient.name}`);
    console.log(`[BALANCE] ${sender.name}: ${newSenderBalance}, ${recipient.name}: ${newRecipientBalance}`);

    return NextResponse.json({
      success: true,
      message: `Transfer of ₦${amount.toLocaleString()} successful`,
      debitTransaction,
      creditTransaction,
      newBalances: {
        sender: { id: senderAccount.id, balance: newSenderBalance },
        recipient: { id: recipientAccount.id, balance: newRecipientBalance }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Transfer API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
