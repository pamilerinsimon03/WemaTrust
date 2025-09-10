export interface User {
  id: string;
  name: string;
  roles: ('admin' | 'user')[];
  accountId?: string;
  avatarUrl?: string;
}

export interface Account {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
  shadowEntries: ShadowEntry[];
}

export type ShadowEntryStatus = 'pending' | 'cleared' | 'failed';

export interface ShadowEntry {
  id: string;
  accountId: string;
  txn_ref: string;
  amount: number;
  status: ShadowEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export type PartnerBankStatus = 'UP' | 'SLOW' | 'DOWN';

export interface PartnerBank {
  id: string;
  name: string;
  status: PartnerBankStatus;
  historicalSuccessRate: number;
}

export interface Transaction {
  id: string;
  txn_ref: string;
  type: 'debit' | 'credit';
  to_account?: string;
  from_bank?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  note?: string;
  createdAt: string;
}

interface UserEvent {
  userId: string;
}

interface AccountEvent extends UserEvent {
  accountId: string;
}

interface ShadowEntryEvent extends ShadowEntry, AccountEvent {}
interface TransactionEvent extends Transaction, UserEvent {}
interface BalanceUpdateEvent extends AccountEvent {
    balance: number;
}


// For SSE events
export type ServerEvent =
  | { type: 'shadow_created'; data: ShadowEntryEvent }
  | { type: 'shadow_updated'; data: ShadowEntryEvent }
  | { type: 'partner_status_changed'; data: PartnerBank }
  | { type: 'new_transaction'; data: TransactionEvent }
  | { type: 'balance_updated'; data: BalanceUpdateEvent }
  | { type: 'notification'; data: { userId: string; notification: { id: string; message: string; timestamp: string; type: string } } };
