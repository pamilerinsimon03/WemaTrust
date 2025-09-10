import type { User, Account, PartnerBank, Transaction, ShadowEntry, PartnerBankStatus, ShadowEntryStatus } from './types';

// Server-only database using file system
class ServerDatabase {
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
  };

  private filePath: string;

  constructor() {
    this.data = {
      users: new Map(),
      accounts: new Map(),
      partnerBanks: new Map(),
      transactions: new Map(),
      shadowEntries: new Map(),
      auditLogs: [],
    };
    
    this.filePath = './data/wematrust_db.json';
    this.loadFromFile();
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
    this.saveToFile();
  }

  private saveToFile() {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', 'wematrust_db.json');
      
      const dataToSave = {
        users: Array.from(this.data.users.entries()),
        accounts: Array.from(this.data.accounts.entries()),
        partnerBanks: Array.from(this.data.partnerBanks.entries()),
        transactions: Array.from(this.data.transactions.entries()),
        shadowEntries: Array.from(this.data.shadowEntries.entries()),
        auditLogs: this.data.auditLogs,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.warn('Failed to save to file:', error);
    }
  }

  private loadFromFile() {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', 'wematrust_db.json');
      
      if (fs.existsSync(filePath)) {
        const saved = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(saved);
        this.data.users = new Map(data.users || []);
        this.data.accounts = new Map(data.accounts || []);
        this.data.partnerBanks = new Map(data.partnerBanks || []);
        this.data.transactions = new Map(data.transactions || []);
        this.data.shadowEntries = new Map(data.shadowEntries || []);
        this.data.auditLogs = data.auditLogs || [];
      }
    } catch (error) {
      console.warn('Failed to load from file:', error);
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

    console.log('Sample data initialized successfully');
    this.saveToFile();
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
    this.saveToFile();
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
    this.saveToFile();
    this.auditLog('accounts', id, 'CREATE', null, newAccount);
    return newAccount;
  }

  updateAccountBalance(id: string, balance: number): Account | null {
    const account = this.data.accounts.get(id);
    if (!account) return null;
    
    const oldAccount = { ...account };
    const updatedAccount = { ...account, balance };
    this.data.accounts.set(id, updatedAccount);
    this.saveToFile();
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
    this.saveToFile();
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
    this.saveToFile();
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
    this.saveToFile();
    this.auditLog('shadow_entries', id, 'CREATE', null, newEntry);
    return newEntry;
  }

  updateShadowEntryStatus(id: string, status: ShadowEntryStatus): ShadowEntry | null {
    const entry = this.data.shadowEntries.get(id);
    if (!entry) return null;
    
    const oldEntry = { ...entry };
    const updatedEntry = { ...entry, status, updatedAt: new Date().toISOString() };
    this.data.shadowEntries.set(id, updatedEntry);
    this.saveToFile();
    this.auditLog('shadow_entries', id, 'UPDATE', oldEntry, updatedEntry);
    return updatedEntry;
  }

  deleteShadowEntry(id: string): boolean {
    const entry = this.data.shadowEntries.get(id);
    if (!entry) return false;
    
    this.data.shadowEntries.delete(id);
    this.saveToFile();
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

  // Utility methods
  clearAllData() {
    this.data.users.clear();
    this.data.accounts.clear();
    this.data.partnerBanks.clear();
    this.data.transactions.clear();
    this.data.shadowEntries.clear();
    this.data.auditLogs = [];
    
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', 'wematrust_db.json');
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}');
      }
    } catch (error) {
      console.warn('Failed to clear file:', error);
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
      auditLogs: this.data.auditLogs,
    };
  }
}

// Create singleton instance
let serverDb: ServerDatabase | null = null;

const getServerDb = () => {
  if (!serverDb) {
    serverDb = new ServerDatabase();
  }
  return serverDb;
};

// Export database operations
export const dbOperations = {
  // User operations
  getUser: (id: string) => getServerDb().getUser(id),
  getAllUsers: () => getServerDb().getAllUsers(),
  createUser: (user: Omit<User, 'id'>) => getServerDb().createUser(user),
  findUserByAccountNumber: (accountNumber: string) => getServerDb().findUserByAccountNumber(accountNumber),

  // Account operations
  getAccount: (id: string) => getServerDb().getAccount(id),
  getAllAccounts: () => getServerDb().getAllAccounts(),
  createAccount: (account: Omit<Account, 'id' | 'shadowEntries'>) => getServerDb().createAccount(account),
  updateAccountBalance: (id: string, balance: number) => getServerDb().updateAccountBalance(id, balance),
  getAccountByNumber: (accountNumber: string) => getServerDb().getAccountByNumber(accountNumber),

  // Partner Bank operations
  getPartnerBank: (id: string) => getServerDb().getPartnerBank(id),
  getAllPartnerBanks: () => getServerDb().getAllPartnerBanks(),
  updatePartnerBankStatus: (id: string, status: PartnerBankStatus) => getServerDb().updatePartnerBankStatus(id, status),

  // Transaction operations
  getTransaction: (id: string) => getServerDb().getTransaction(id),
  getTransactionsByUser: (userId: string) => getServerDb().getTransactionsByUser(userId),
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'> & { userId: string }) => getServerDb().createTransaction(transaction),
  getTransactionByRef: (txnRef: string) => getServerDb().getTransactionByRef(txnRef),

  // Shadow Entry operations
  createShadowEntry: (entry: { accountId: string; txn_ref: string; amount: number; status: ShadowEntryStatus }) => getServerDb().createShadowEntry(entry),
  updateShadowEntryStatus: (id: string, status: ShadowEntryStatus) => getServerDb().updateShadowEntryStatus(id, status),
  deleteShadowEntry: (id: string) => getServerDb().deleteShadowEntry(id),
  getShadowEntryByRef: (txnRef: string) => getServerDb().getShadowEntryByRef(txnRef),

  // Utility operations
  clearAllData: () => getServerDb().clearAllData(),
  exportData: () => getServerDb().exportData(),
};

export default getServerDb;
