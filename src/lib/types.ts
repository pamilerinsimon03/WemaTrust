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

// For SSE events
export type ServerEvent =
  | { type: 'shadow_created'; data: ShadowEntry }
  | { type: 'shadow_updated'; data: ShadowEntry }
  | { type: 'partner_status_changed'; data: PartnerBank }
  | { type: 'new_transaction'; data: Transaction }
  | { type: 'balance_updated'; data: { balance: number } };
