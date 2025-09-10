import {
  Account,
  PartnerBank,
  Transaction,
  ShadowEntry,
  ShadowEntryStatus,
  User,
  PartnerBankStatus,
} from './types';
import sseEmitter from './events';
import { dbOperations } from './database';
import { notificationService } from './notification-service';

// --- Data Accessors ---

export const getUsers = (): User[] => dbOperations.getAllUsers();
export const getUser = (id: string): User | undefined => {
  try {
    return dbOperations.getUser(id) || undefined;
  } catch (error) {
    console.error('Error getting user:', error);
    return undefined;
  }
};
export const findUserByAccountId = (accountNumber: string): User | undefined => 
  dbOperations.findUserByAccountNumber(accountNumber) || undefined;

export const getAccount = (id: string): Account | undefined => {
  try {
    return dbOperations.getAccount(id) || undefined;
  } catch (error) {
    console.error('Error getting account:', error);
    return undefined;
  }
};

export const getPartnerBanks = (): PartnerBank[] => {
  try {
    return dbOperations.getAllPartnerBanks();
  } catch (error) {
    console.error('Error getting partner banks:', error);
    return [];
  }
};
export const getPartnerBank = (id: string): PartnerBank | undefined => {
  try {
    return dbOperations.getPartnerBank(id) || undefined;
  } catch (error) {
    console.error('Error getting partner bank:', error);
    return undefined;
  }
};

export const getTransactionsForUser = (userId: string): Transaction[] => {
  try {
    return dbOperations.getTransactionsByUser(userId);
  } catch (error) {
    console.error('Error getting transactions for user:', error);
    return [];
  }
};

// --- Data Mutators ---

const emitEvent = (event: any) => {
  sseEmitter.emit('event', event);
};

export const updatePartnerBankStatus = (
  id: string,
  status: PartnerBankStatus
): PartnerBank | null => {
  const updatedBank = dbOperations.updatePartnerBankStatus(id, status);
  if (updatedBank) {
    emitEvent({ type: 'partner_status_changed', data: updatedBank });
    console.log(`[PARTNER STATUS] Bank ${updatedBank.name} status updated to ${status}`);
    
    // Send notification to all users about bank status change
    notificationService.sendBankStatusChangeNotification(updatedBank.name, status);
  }
  return updatedBank;
};

export const createTransaction = (
  tx: Omit<Transaction, 'id' | 'createdAt'> & { userId: string }
): Transaction => {
  const newTx = dbOperations.createTransaction(tx);
  emitEvent({ type: 'new_transaction', data: { ...newTx, userId: tx.userId } });

  if (newTx.status === 'success') {
    const user = dbOperations.getUser(tx.userId);
    if (user && user.accountId) {
      const account = dbOperations.getAccount(user.accountId);
      if (account) {
        let newBalance: number;
        if (newTx.type === 'debit') {
          newBalance = account.balance - newTx.amount;
        } else if (newTx.type === 'credit') {
          newBalance = account.balance + newTx.amount;
        } else {
          return newTx; // No balance change for other transaction types
        }
        
        dbOperations.updateAccountBalance(user.accountId, newBalance);
        emitEvent({ 
          type: 'balance_updated', 
          data: { accountId: account.id, balance: newBalance, userId: tx.userId } 
        });
      }
    }
  }

  return newTx;
};

export const processNipEventForUser = (event: {
  txn_ref: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  to_account: string;
  from_bank?: string;
  note?: string;
}) => {
  const recipientUser = dbOperations.findUserByAccountNumber(event.to_account);

  if (!recipientUser || !recipientUser.accountId) {
    console.error(`[NIP Event] Recipient account not found for number: ${event.to_account}`);
    return;
  }
  
  const targetAccount = dbOperations.getAccount(recipientUser.accountId);
  if (!targetAccount) {
    console.error(`[NIP Event] Account object not found for ID: ${recipientUser.accountId}`);
    return;
  }

  let shadowEntry = dbOperations.getShadowEntryByRef(event.txn_ref);

  if (event.status === 'pending') {
    if (!shadowEntry) {
      shadowEntry = dbOperations.createShadowEntry({
        accountId: targetAccount.id,
        txn_ref: event.txn_ref,
        amount: event.amount,
        status: 'pending',
      });
      console.log(
        `[SMS STUB] To: ${recipientUser.name} - Incoming transfer of ${event.amount} is pending. Ref: ${event.txn_ref}`
      );
      
      // Send notification to recipient
      notificationService.sendIncomingTransferNotifications(
        recipientUser.id,
        event.amount,
        event.from_bank || 'Unknown Bank',
        event.txn_ref,
        'pending'
      );
      
      emitEvent({
        type: 'shadow_created',
        data: { ...shadowEntry, userId: recipientUser.id },
      });
    }
  } else if (shadowEntry) {
    const newStatus: ShadowEntryStatus =
      event.status === 'success' ? 'cleared' : 'failed';
    
    const updatedShadowEntry = dbOperations.updateShadowEntryStatus(shadowEntry.id, newStatus);

    if (newStatus === 'cleared') {
      const newBalance = targetAccount.balance + shadowEntry.amount;
      dbOperations.updateAccountBalance(targetAccount.id, newBalance);
      dbOperations.deleteShadowEntry(shadowEntry.id);

      dbOperations.createTransaction({
        userId: recipientUser.id,
        txn_ref: event.txn_ref,
        type: 'credit',
        amount: event.amount,
        status: 'success',
        note: event.note || 'NIP Inward',
        from_bank: event.from_bank,
      });

      console.log(
        `[SMS STUB] To: ${recipientUser.name} - Your account has been credited with ${event.amount}. Ref: ${event.txn_ref}`
      );
      
      // Send notification to recipient
      notificationService.sendIncomingTransferNotifications(
        recipientUser.id,
        event.amount,
        event.from_bank || 'Unknown Bank',
        event.txn_ref,
        'cleared'
      );
      
      emitEvent({
        type: 'balance_updated',
        data: {
          accountId: targetAccount.id,
          balance: newBalance,
          userId: recipientUser.id,
        },
      });
    } else {
      console.log(
        `[SMS STUB] To: ${recipientUser.name} - Incoming transfer of ${event.amount} failed. Ref: ${event.txn_ref}`
      );
      
      // Send notification to recipient
      notificationService.sendIncomingTransferNotifications(
        recipientUser.id,
        event.amount,
        event.from_bank || 'Unknown Bank',
        event.txn_ref,
        'failed'
      );
    }
    
    if (updatedShadowEntry) {
      emitEvent({
        type: 'shadow_updated',
        data: { ...updatedShadowEntry, userId: recipientUser.id },
      });
    }
  }
};