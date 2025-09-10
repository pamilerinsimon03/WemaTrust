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
      userId: fromUserId,
      txn_ref: txnRef,
      type: 'debit',
      amount,
      to_account: toAccountNumber,
      from_bank: 'WemaTrust',
      note: note || `Transfer to ${toAccountNumber}`,
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
      senderUserId: fromUserId,
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

    return NextResponse.json({
      success: true,
      message: `Transfer of ₦${amount.toLocaleString()} successful`,
      debitTransaction,
      creditTransaction,
      transferLog: {
        id: transferLog.id,
        instantStatus: transferLog.instantStatus,
        backendStatus: transferLog.backendStatus,
        transferType: transferLog.transferType,
      },
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
