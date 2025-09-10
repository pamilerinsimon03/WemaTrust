import type { User, Account, PartnerBank, Transaction, ShadowEntry, PartnerBankStatus, ShadowEntryStatus, PrefundedAccount, TransferLog } from './types';

// Check if we're on the server side
const isServer = typeof window === 'undefined';

// Import server database only on server side
let serverDbOperations: any = null;
if (isServer) {
  try {
    // Use production database in production, server database in development
    if (process.env.NODE_ENV === 'production') {
      const productionDb = require('./production-database');
      serverDbOperations = productionDb.productionDb;
    } else {
      const serverDb = require('./server-database');
      serverDbOperations = serverDb.dbOperations;
    }
  } catch (error) {
    console.warn('Failed to load server database:', error);
    console.error('Error details:', error);
  }
}

// Browser-compatible database using localStorage and in-memory storage
class BrowserDatabase {
  private data: {
    users: Map<string, User>;
    accounts: Map<string, Account>;
    partnerBanks: Map<string, PartnerBank>;
    transactions: Map<string, Transaction[]>;
    shadowEntries: Map<string, ShadowEntry[]>;
    auditLogs: Array<{
      id: string;
      tableName: string;
      recordId: string;
      action: string;
      oldValues: any;
      newValues: any;
      userId?: string;
      createdAt: string;
    }>;
    prefundedAccounts: Map<string, PrefundedAccount>;
    transferLogs: Map<string, TransferLog>;
  };

  constructor() {
    this.data = {
      users: new Map(),
      accounts: new Map(),
      partnerBanks: new Map(),
      transactions: new Map(),
      shadowEntries: new Map(),
      auditLogs: [],
      prefundedAccounts: new Map(),
      transferLogs: new Map(),
    };
    
    this.loadFromStorage();
    this.initializeSampleData();
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private auditLog(tableName: string, recordId: string, action: string, oldValues: any, newValues: any, userId?: string) {
    const log = {
      id: this.generateId('audit'),
      tableName,
      recordId,
      action,
      oldValues,
      newValues,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.push(log);
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      const dataToSave = {
        users: Array.from(this.data.users.entries()),
        accounts: Array.from(this.data.accounts.entries()),
        partnerBanks: Array.from(this.data.partnerBanks.entries()),
        transactions: Array.from(this.data.transactions.entries()),
        shadowEntries: Array.from(this.data.shadowEntries.entries()),
        auditLogs: this.data.auditLogs,
        prefundedAccounts: Array.from(this.data.prefundedAccounts.entries()),
        transferLogs: Array.from(this.data.transferLogs.entries()),
      };
      localStorage.setItem('wematrust_db', JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('wematrust_db');
      if (saved) {
        const data = JSON.parse(saved);
        this.data.users = new Map(data.users || []);
        this.data.accounts = new Map(data.accounts || []);
        this.data.partnerBanks = new Map(data.partnerBanks || []);
        this.data.transactions = new Map(data.transactions || []);
        this.data.shadowEntries = new Map(data.shadowEntries || []);
        this.data.auditLogs = data.auditLogs || [];
        this.data.prefundedAccounts = new Map(data.prefundedAccounts || []);
        this.data.transferLogs = new Map(data.transferLogs || []);
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
  }

  private initializeSampleData() {
    // Only initialize if no data exists
    if (this.data.users.size > 0) return;

    console.log('Initializing sample data...');

    // Create sample accounts
    const account1: Account = {
      id: 'acc_1',
      name: 'Demo User 1',
      accountNumber: '0123456789',
      balance: 100000,
      shadowEntries: [],
    };

    const account2: Account = {
      id: 'acc_2',
      name: 'Demo User 2',
      accountNumber: '9876543210',
      balance: 50000,
      shadowEntries: [],
    };

    this.data.accounts.set(account1.id, account1);
    this.data.accounts.set(account2.id, account2);

    // Create sample users
    const admin: User = {
      id: 'admin',
      name: 'Admin',
      roles: ['admin'],
    };

    const user1: User = {
      id: 'user1',
      name: 'Demo User 1',
      roles: ['user'],
      accountId: account1.id,
    };

    const user2: User = {
      id: 'user2',
      name: 'Demo User 2',
      roles: ['user'],
      accountId: account2.id,
    };

    this.data.users.set(admin.id, admin);
    this.data.users.set(user1.id, user1);
    this.data.users.set(user2.id, user2);

    // Create partner banks
    const partnerBanks: PartnerBank[] = [
      { id: 'bank_a', name: 'Zenith Bank', status: 'UP', historicalSuccessRate: 0.98 },
      { id: 'bank_b', name: 'GTBank', status: 'UP', historicalSuccessRate: 0.99 },
      { id: 'bank_c', name: 'Access Bank', status: 'SLOW', historicalSuccessRate: 0.85 },
      { id: 'bank_d', name: 'UBA', status: 'DOWN', historicalSuccessRate: 0.6 },
    ];

    partnerBanks.forEach(bank => {
      this.data.partnerBanks.set(bank.id, bank);
    });

    // Create prefunded accounts for major banks
    const prefundedAccounts: PrefundedAccount[] = [
      {
        id: 'pfa_zenith',
        bankId: 'bank_a',
        bankName: 'Zenith Bank',
        accountNumber: '2087654321',
        balance: 50000000, // 50M NGN liquidity pool
        status: 'ACTIVE',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pfa_gtbank',
        bankId: 'bank_b',
        bankName: 'GTBank',
        accountNumber: '0127654321',
        balance: 75000000, // 75M NGN liquidity pool
        status: 'ACTIVE',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pfa_access',
        bankId: 'bank_c',
        bankName: 'Access Bank',
        accountNumber: '0447654321',
        balance: 25000000, // 25M NGN liquidity pool
        status: 'LOW', // Lower due to SLOW bank status
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pfa_uba',
        bankId: 'bank_d',
        bankName: 'UBA',
        accountNumber: '2227654321',
        balance: 5000000, // 5M NGN minimal pool due to DOWN status
        status: 'DEPLETED',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    prefundedAccounts.forEach(account => {
      this.data.prefundedAccounts.set(account.id, account);
    });

    console.log('Sample data initialized successfully');
    this.saveToStorage();
  }

  // User operations
  getUser(id: string): User | null {
    return this.data.users.get(id) || null;
  }

  getAllUsers(): User[] {
    return Array.from(this.data.users.values());
  }

  createUser(user: Omit<User, 'id'>): User {
    const id = this.generateId('user');
    const newUser: User = { ...user, id };
    this.data.users.set(id, newUser);
    this.saveToStorage();
    this.auditLog('users', id, 'CREATE', null, newUser);
    return newUser;
  }

  findUserByAccountNumber(accountNumber: string): User | null {
    for (const user of this.data.users.values()) {
      if (user.accountId) {
        const account = this.data.accounts.get(user.accountId);
        if (account && account.accountNumber === accountNumber) {
          return user;
        }
      }
    }
    return null;
  }

  // Account operations
  getAccount(id: string): Account | null {
    const account = this.data.accounts.get(id);
    if (!account) return null;
    const shadowEntries = Array.from(this.data.shadowEntries.values()).filter(se => se.accountId === id);
    return { ...account, shadowEntries: [...shadowEntries] };
  }

  getAllAccounts(): Account[] {
    return Array.from(this.data.accounts.values()).map(account => {
      const shadowEntries = Array.from(this.data.shadowEntries.values()).filter(se => se.accountId === account.id);
      return { ...account, shadowEntries: [...shadowEntries] };
    });
  }

  createAccount(account: Omit<Account, 'id' | 'shadowEntries'>): Account {
    const id = this.generateId('acc');
    const newAccount: Account = { ...account, id, shadowEntries: [] };
    this.data.accounts.set(id, newAccount);
    this.saveToStorage();
    this.auditLog('accounts', id, 'CREATE', null, newAccount);
    return newAccount;
  }

  updateAccountBalance(id: string, balance: number): Account | null {
    const account = this.data.accounts.get(id);
    if (!account) return null;
    
    const oldAccount = { ...account };
    const updatedAccount = { ...account, balance };
    this.data.accounts.set(id, updatedAccount);
    this.saveToStorage();
    this.auditLog('accounts', id, 'UPDATE', oldAccount, updatedAccount);
    return updatedAccount;
  }

  getAccountByNumber(accountNumber: string): Account | null {
    for (const account of this.data.accounts.values()) {
      if (account.accountNumber === accountNumber) {
        const shadowEntries = Array.from(this.data.shadowEntries.values()).filter(se => se.accountId === account.id);
        return { ...account, shadowEntries: [...shadowEntries] };
      }
    }
    return null;
  }

  // Partner Bank operations
  getPartnerBank(id: string): PartnerBank | null {
    return this.data.partnerBanks.get(id) || null;
  }

  getAllPartnerBanks(): PartnerBank[] {
    return Array.from(this.data.partnerBanks.values());
  }

  updatePartnerBankStatus(id: string, status: PartnerBankStatus): PartnerBank | null {
    const bank = this.data.partnerBanks.get(id);
    if (!bank) return null;
    
    const oldBank = { ...bank };
    const updatedBank = { ...bank, status };
    this.data.partnerBanks.set(id, updatedBank);
    this.saveToStorage();
    this.auditLog('partner_banks', id, 'UPDATE', oldBank, updatedBank);
    return updatedBank;
  }

  // Transaction operations
  getTransaction(id: string): Transaction | null {
    for (const transactions of this.data.transactions.values()) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) return transaction;
    }
    return null;
  }

  getTransactionsByUser(userId: string): Transaction[] {
    const userTransactions: Transaction[] = [];
    for (const transactions of this.data.transactions.values()) {
      userTransactions.push(...transactions.filter(t => t.userId === userId));
    }
    return userTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'> & { userId: string }): Transaction {
    const id = this.generateId('tx');
    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: new Date().toISOString(),
    };
    
    const userTransactions = this.data.transactions.get(transaction.userId) || [];
    userTransactions.push(newTransaction);
    this.data.transactions.set(transaction.userId, userTransactions);
    this.saveToStorage();
    this.auditLog('transactions', id, 'CREATE', null, newTransaction, transaction.userId);
    return newTransaction;
  }

  getTransactionByRef(txnRef: string): Transaction | null {
    for (const transactions of this.data.transactions.values()) {
      const transaction = transactions.find(t => t.txn_ref === txnRef);
      if (transaction) return transaction;
    }
    return null;
  }

  // Shadow Entry operations
  createShadowEntry(entry: { accountId: string; txn_ref: string; amount: number; status: ShadowEntryStatus }): ShadowEntry {
    const id = this.generateId('sh');
    const newEntry: ShadowEntry = {
      id,
      accountId: entry.accountId,
      txn_ref: entry.txn_ref,
      amount: entry.amount,
      status: entry.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.shadowEntries.set(id, newEntry);
    this.saveToStorage();
    this.auditLog('shadow_entries', id, 'CREATE', null, newEntry);
    return newEntry;
  }

  updateShadowEntryStatus(id: string, status: ShadowEntryStatus): ShadowEntry | null {
    const entry = this.data.shadowEntries.get(id);
    if (!entry) return null;
    
    const oldEntry = { ...entry };
    const updatedEntry = { ...entry, status, updatedAt: new Date().toISOString() };
    this.data.shadowEntries.set(id, updatedEntry);
    this.saveToStorage();
    this.auditLog('shadow_entries', id, 'UPDATE', oldEntry, updatedEntry);
    return updatedEntry;
  }

  deleteShadowEntry(id: string): boolean {
    const entry = this.data.shadowEntries.get(id);
    if (!entry) return false;
    
    this.data.shadowEntries.delete(id);
    this.saveToStorage();
    this.auditLog('shadow_entries', id, 'DELETE', entry, null);
    return true;
  }

  getShadowEntryByRef(txnRef: string): ShadowEntry | null {
    for (const entry of this.data.shadowEntries.values()) {
      if (entry.txn_ref === txnRef) {
        return entry;
      }
    }
    return null;
  }

  // Prefunded Account methods
  getAllPrefundedAccounts(): PrefundedAccount[] {
    return Array.from(this.data.prefundedAccounts.values());
  }

  getPrefundedAccount(id: string): PrefundedAccount | null {
    return this.data.prefundedAccounts.get(id) || null;
  }

  createPrefundedAccount(account: Omit<PrefundedAccount, 'id' | 'createdAt'>): PrefundedAccount {
    const id = `pfa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAccount: PrefundedAccount = {
      ...account,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.prefundedAccounts.set(id, newAccount);
    this.saveToStorage();
    return newAccount;
  }

  updatePrefundedAccountBalance(id: string, balance: number): boolean {
    const account = this.data.prefundedAccounts.get(id);
    if (account) {
      const updatedAccount = { ...account, balance };
      this.data.prefundedAccounts.set(id, updatedAccount);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Transfer Log methods
  getAllTransferLogs(): TransferLog[] {
    return Array.from(this.data.transferLogs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getTransferLog(id: string): TransferLog | null {
    return this.data.transferLogs.get(id) || null;
  }

  createTransferLog(log: Omit<TransferLog, 'id' | 'createdAt'>): TransferLog {
    const id = `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLog: TransferLog = {
      ...log,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.transferLogs.set(id, newLog);
    this.saveToStorage();
    return newLog;
  }

  updateTransferLogBackendStatus(
    id: string, 
    status: 'PENDING' | 'SETTLED' | 'FAILED' | 'REVERSED', 
    settlementReference?: string
  ): boolean {
    const log = this.data.transferLogs.get(id);
    if (log) {
      const updatedLog = { 
        ...log, 
        backendStatus: status,
        settledAt: status === 'SETTLED' ? new Date().toISOString() : log.settledAt,
        settlementReference: settlementReference || log.settlementReference
      };
      this.data.transferLogs.set(id, updatedLog);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Utility methods
  clearAllData() {
    this.data.users.clear();
    this.data.accounts.clear();
    this.data.partnerBanks.clear();
    this.data.transactions.clear();
    this.data.shadowEntries.clear();
    this.data.prefundedAccounts.clear();
    this.data.transferLogs.clear();
    this.data.auditLogs = [];
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('wematrust_db');
    }
    
    this.initializeSampleData();
  }

  exportData() {
    return {
      users: Array.from(this.data.users.entries()),
      accounts: Array.from(this.data.accounts.entries()),
      partnerBanks: Array.from(this.data.partnerBanks.entries()),
      transactions: Array.from(this.data.transactions.entries()),
      shadowEntries: Array.from(this.data.shadowEntries.entries()),
      prefundedAccounts: Array.from(this.data.prefundedAccounts.entries()),
      transferLogs: Array.from(this.data.transferLogs.entries()),
      auditLogs: this.data.auditLogs,
    };
  }
}

// Create singleton instance
let browserDb: BrowserDatabase | null = null;

const getBrowserDb = () => {
  if (!browserDb) {
    browserDb = new BrowserDatabase();
  }
  return browserDb;
};

// Export database operations - use server database on server, browser database on client
export const dbOperations = isServer && serverDbOperations ? serverDbOperations : {
  // User operations
  getUser: (id: string) => getBrowserDb().getUser(id),
  getAllUsers: () => getBrowserDb().getAllUsers(),
  createUser: (user: Omit<User, 'id'>) => getBrowserDb().createUser(user),
  findUserByAccountNumber: (accountNumber: string) => getBrowserDb().findUserByAccountNumber(accountNumber),

  // Account operations
  getAccount: (id: string) => getBrowserDb().getAccount(id),
  getAllAccounts: () => getBrowserDb().getAllAccounts(),
  createAccount: (account: Omit<Account, 'id' | 'shadowEntries'>) => getBrowserDb().createAccount(account),
  updateAccountBalance: (id: string, balance: number) => getBrowserDb().updateAccountBalance(id, balance),
  getAccountByNumber: (accountNumber: string) => getBrowserDb().getAccountByNumber(accountNumber),

  // Partner Bank operations
  getPartnerBank: (id: string) => getBrowserDb().getPartnerBank(id),
  getAllPartnerBanks: () => getBrowserDb().getAllPartnerBanks(),
  updatePartnerBankStatus: (id: string, status: PartnerBankStatus) => getBrowserDb().updatePartnerBankStatus(id, status),

  // Transaction operations
  getTransaction: (id: string) => getBrowserDb().getTransaction(id),
  getTransactionsByUser: (userId: string) => getBrowserDb().getTransactionsByUser(userId),
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'> & { userId: string }) => getBrowserDb().createTransaction(transaction),
  getTransactionByRef: (txnRef: string) => getBrowserDb().getTransactionByRef(txnRef),

  // Shadow Entry operations
  createShadowEntry: (entry: { accountId: string; txn_ref: string; amount: number; status: ShadowEntryStatus }) => getBrowserDb().createShadowEntry(entry),
  updateShadowEntryStatus: (id: string, status: ShadowEntryStatus) => getBrowserDb().updateShadowEntryStatus(id, status),
  deleteShadowEntry: (id: string) => getBrowserDb().deleteShadowEntry(id),
  getShadowEntryByRef: (txnRef: string) => getBrowserDb().getShadowEntryByRef(txnRef),

  // Prefunded Account operations
  getAllPrefundedAccounts: () => getBrowserDb().getAllPrefundedAccounts(),
  getPrefundedAccount: (id: string) => getBrowserDb().getPrefundedAccount(id),
  createPrefundedAccount: (account: Omit<PrefundedAccount, 'id' | 'createdAt'>) => getBrowserDb().createPrefundedAccount(account),
  updatePrefundedAccountBalance: (id: string, balance: number) => getBrowserDb().updatePrefundedAccountBalance(id, balance),

  // Transfer Log operations
  getAllTransferLogs: () => getBrowserDb().getAllTransferLogs(),
  getTransferLog: (id: string) => getBrowserDb().getTransferLog(id),
  createTransferLog: (log: Omit<TransferLog, 'id' | 'createdAt'>) => getBrowserDb().createTransferLog(log),
  updateTransferLogBackendStatus: (id: string, status: 'PENDING' | 'SETTLED' | 'FAILED' | 'REVERSED', settlementReference?: string) => getBrowserDb().updateTransferLogBackendStatus(id, status, settlementReference),

  // Utility operations
  clearAllData: () => getBrowserDb().clearAllData(),
  exportData: () => getBrowserDb().exportData(),
};

export default getBrowserDb;