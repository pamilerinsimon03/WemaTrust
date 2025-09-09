import {
  Account,
  PartnerBank,
  Transaction,
  ShadowEntry,
  ShadowEntryStatus,
  User,
} from './types';
import sseEmitter from './events';

interface Store {
  users: Map<string, User>;
  accounts: Map<string, Account>;
  partnerBanks: Map<string, PartnerBank>;
  transactions: Transaction[];
}

// In-memory store. This will reset on server restart.
const store: Store = {
  users: new Map([
    ['admin', { id: 'admin', name: 'Admin', roles: ['admin'] }],
    [
      'user1',
      {
        id: 'user1',
        name: 'Demo User 1',
        roles: ['user'],
        accountId: '1',
      },
    ],
    [
      'user2',
      {
        id: 'user2',
        name: 'Demo User 2',
        roles: ['user'],
        accountId: '2',
      },
    ],
  ]),
  accounts: new Map([
    [
      '1',
      {
        id: '1',
        name: 'Demo User 1',
        accountNumber: '0123456789',
        balance: 100000,
        shadowEntries: [],
      },
    ],
    [
      '2',
      {
        id: '2',
        name: 'Demo User 2',
        accountNumber: '9876543210',
        balance: 50000,
        shadowEntries: [],
      },
    ],
  ]),
  partnerBanks: new Map([
    [
      'bank_a',
      {
        id: 'bank_a',
        name: 'Zenith Bank',
        status: 'UP',
        historicalSuccessRate: 0.98,
      },
    ],
    [
      'bank_b',
      { id: 'bank_b', name: 'GTBank', status: 'UP', historicalSuccessRate: 0.99 },
    ],
    [
      'bank_c',
      {
        id: 'bank_c',
        name: 'Access Bank',
        status: 'SLOW',
        historicalSuccessRate: 0.85,
      },
    ],
    [
      'bank_d',
      { id: 'bank_d', name: 'UBA', status: 'DOWN', historicalSuccessRate: 0.6 },
    ],
  ]),
  transactions: [],
};

// --- Data Accessors ---

export const getUsers = (): User[] => Array.from(store.users.values());
export const getUser = (id: string): User | undefined => store.users.get(id);

export const getAccount = (id: string): Account | undefined => {
  const account = store.accounts.get(id);
  if (!account) return undefined;
  return { ...account, shadowEntries: [...account.shadowEntries] };
};

export const getPartnerBanks = (): PartnerBank[] =>
  Array.from(store.partnerBanks.values());
export const getPartnerBank = (id: string): PartnerBank | undefined =>
  store.partnerBanks.get(id);
export const getTransactions = (): Transaction[] =>
  [...store.transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

// --- Data Mutators ---

const emitEvent = (event: any) => {
  sseEmitter.emit('event', event);
};

export const updatePartnerBankStatus = (
  id: string,
  status: PartnerBank['status'],
  successRate: number
): PartnerBank | null => {
  const bank = store.partnerBanks.get(id);
  if (bank) {
    bank.status = status;
    bank.historicalSuccessRate = successRate;
    emitEvent({ type: 'partner_status_changed', data: bank });
    console.log(`[PARTNER STATUS] Bank ${bank.name} status updated to ${status}`);
    return bank;
  }
  return null;
};

export const createTransaction = (
  tx: Omit<Transaction, 'id' | 'createdAt'>
): Transaction => {
  const newTx: Transaction = {
    ...tx,
    id: `tx_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  store.transactions.push(newTx);
  emitEvent({ type: 'new_transaction', data: newTx });

  if (newTx.type === 'debit' && newTx.status === 'success') {
    const user = store.users.get('user1'); // Assuming user1 is the sender for now
    if (user && user.accountId) {
        const account = store.accounts.get(user.accountId)!;
        account.balance -= newTx.amount;
        emitEvent({ type: 'balance_updated', data: { accountId: account.id, balance: account.balance } });
    }
  }

  return newTx;
};

export const processNipEvent = (event: {
  txn_ref: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  to_account: string;
}) => {
  const targetAccount = Array.from(store.accounts.values()).find(
    (acc) => acc.accountNumber === event.to_account
  );

  if (!targetAccount) {
    console.error(`[NIP Event] Account not found for number: ${event.to_account}`);
    return;
  }

  let shadowEntry = targetAccount.shadowEntries.find(
    (e) => e.txn_ref === event.txn_ref
  );

  if (event.status === 'pending') {
    if (!shadowEntry) {
      shadowEntry = {
        id: `sh_${Date.now()}`,
        txn_ref: event.txn_ref,
        amount: event.amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      targetAccount.shadowEntries.push(shadowEntry);
      console.log(
        `[SMS STUB] To: User - NIP transfer of ${event.amount} is pending. Ref: ${event.txn_ref}`
      );
      emitEvent({
        type: 'shadow_created',
        data: { ...shadowEntry, accountId: targetAccount.id },
      });
    }
  } else if (shadowEntry) {
    const newStatus: ShadowEntryStatus =
      event.status === 'success' ? 'cleared' : 'failed';
    shadowEntry.status = newStatus;
    shadowEntry.updatedAt = new Date().toISOString();

    if (newStatus === 'cleared') {
      targetAccount.balance += shadowEntry.amount;
      targetAccount.shadowEntries = targetAccount.shadowEntries.filter(
        (e) => e.id !== shadowEntry!.id
      );

      createTransaction({
        txn_ref: event.txn_ref,
        type: 'credit',
        amount: event.amount,
        status: 'success',
        note: 'NIP Inward',
      });

      console.log(
        `[SMS STUB] To: User - Your account has been credited with ${event.amount}. Ref: ${event.txn_ref}`
      );
      emitEvent({
        type: 'balance_updated',
        data: {
          accountId: targetAccount.id,
          balance: targetAccount.balance,
        },
      });
    } else {
      console.log(
        `[SMS STUB] To: User - NIP transfer of ${event.amount} failed. Ref: ${event.txn_ref}`
      );
    }
    emitEvent({
      type: 'shadow_updated',
      data: { ...shadowEntry, accountId: targetAccount.id },
    });
  }
};
