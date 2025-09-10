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


export interface PrefundedAccount {
  id: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  status: 'ACTIVE' | 'LOW' | 'DEPLETED';
  lastReplenished: string;
  createdAt: string;
}

export interface TransferLog {
  id: string;
  transactionId: string;
  senderUserId: string;
  senderName: string;
  senderAccount: string;
  recipientUserId: string;
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  amount: number;
  transferType: 'WEMA_TO_WEMA' | 'WEMA_TO_OTHER' | 'OTHER_TO_WEMA';
  instantStatus: 'CREDITED' | 'PENDING' | 'FAILED';
  backendStatus: 'PENDING' | 'SETTLED' | 'FAILED' | 'REVERSED';
  prefundedAccountUsed?: string;
  prefundedAccountBalance?: number;
  settlementReference?: string;
  createdAt: string;
  settledAt?: string;
  notes?: string;
}

export interface AdminLogsData {
  totalTransfers: number;
  instantCredits: number;
  pendingSettlements: number;
  failedSettlements: number;
  prefundedAccounts: PrefundedAccount[];
  recentTransfers: TransferLog[];
  systemHealth: {
    wemaToWemaSuccessRate: number;
    wemaToOtherSuccessRate: number;
    averageSettlementTime: number;
    prefundedAccountHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
}

// For SSE events
export type ServerEvent =
  | { type: 'shadow_created'; data: ShadowEntryEvent }
  | { type: 'shadow_updated'; data: ShadowEntryEvent }
  | { type: 'partner_status_changed'; data: PartnerBank }
  | { type: 'new_transaction'; data: TransactionEvent }
  | { type: 'balance_updated'; data: BalanceUpdateEvent }
  | { type: 'notification'; data: { userId: string; notification: { id: string; message: string; timestamp: string; type: string } } };
