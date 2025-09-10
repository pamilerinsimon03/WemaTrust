import type { User, Account, PartnerBank, Transaction, ShadowEntry, PartnerBankStatus, ShadowEntryStatus, PrefundedAccount, TransferLog } from './types';

// Production-ready database that works on Render
class ProductionDatabase {
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

  private isProduction: boolean;

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
    
    this.isProduction = process.env.NODE_ENV === 'production';
    
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
    
    // Keep only last 1000 audit logs to prevent memory issues
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(-1000);
    }
  }

  private initializeSampleData() {
    // Only initialize if data is empty
    if (this.data.users.size > 0) {
      return;
    }

    console.log('Initializing sample data...');

    // Create sample users
    const user1: User = {
      id: 'user1',
      name: 'Demo User 1',
      email: 'demo1@wematrust.com',
      phone: '+2348012345678',
      accountId: 'acc_1',
      roles: ['user'],
      createdAt: new Date().toISOString(),
    };

    const user2: User = {
      id: 'user2',
      name: 'Demo User 2',
      email: 'demo2@wematrust.com',
      phone: '+2348098765432',
      accountId: 'acc_2',
      roles: ['user'],
      createdAt: new Date().toISOString(),
    };

    const admin: User = {
      id: 'admin',
      name: 'Admin User',
      email: 'admin@wematrust.com',
      phone: '+2348000000000',
      accountId: 'acc_admin',
      roles: ['admin'],
      createdAt: new Date().toISOString(),
    };

    // Create sample accounts
    const account1: Account = {
      id: 'acc_1',
      name: 'Demo User 1',
      accountNumber: '0123456789',
      balance: 100000,
      shadowEntries: [],
      createdAt: new Date().toISOString(),
    };

    const account2: Account = {
      id: 'acc_2',
      name: 'Demo User 2',
      accountNumber: '9876543210',
      balance: 50000,
      shadowEntries: [],
      createdAt: new Date().toISOString(),
    };

    const adminAccount: Account = {
      id: 'acc_admin',
      name: 'Admin User',
      accountNumber: '0000000000',
      balance: 1000000,
      shadowEntries: [],
      createdAt: new Date().toISOString(),
    };

    // Create sample partner banks
    const partnerBanks: PartnerBank[] = [
      {
        id: 'bank_a',
        name: 'Zenith Bank',
        code: '057',
        status: 'UP',
        lastChecked: new Date().toISOString(),
        responseTime: 120,
        uptime: 99.9,
      },
      {
        id: 'bank_b',
        name: 'GTBank',
        code: '058',
        status: 'UP',
        lastChecked: new Date().toISOString(),
        responseTime: 95,
        uptime: 99.8,
      },
      {
        id: 'bank_c',
        name: 'Access Bank',
        code: '044',
        status: 'SLOW',
        lastChecked: new Date().toISOString(),
        responseTime: 2500,
        uptime: 95.5,
      },
      {
        id: 'bank_d',
        name: 'UBA',
        code: '033',
        status: 'DOWN',
        lastChecked: new Date().toISOString(),
        responseTime: 0,
        uptime: 0,
      },
    ];

    // Create sample prefunded accounts
    const prefundedAccounts: PrefundedAccount[] = [
      {
        id: 'pfa_zenith',
        bankId: 'bank_a',
        bankName: 'Zenith Bank',
        accountNumber: '2087654321',
        balance: 50000000,
        status: 'ACTIVE',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pfa_gtbank',
        bankId: 'bank_b',
        bankName: 'GTBank',
        accountNumber: '0127654321',
        balance: 75000000,
        status: 'ACTIVE',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pfa_access',
        bankId: 'bank_c',
        bankName: 'Access Bank',
        accountNumber: '0447654321',
        balance: 25000000,
        status: 'LOW',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pfa_uba',
        bankId: 'bank_d',
        bankName: 'UBA',
        accountNumber: '2227654321',
        balance: 5000000,
        status: 'DEPLETED',
        lastReplenished: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    // Add all data
    this.data.users.set(user1.id, user1);
    this.data.users.set(user2.id, user2);
    this.data.users.set(admin.id, admin);

    this.data.accounts.set(account1.id, account1);
    this.data.accounts.set(account2.id, account2);
    this.data.accounts.set(adminAccount.id, adminAccount);

    partnerBanks.forEach(bank => {
      this.data.partnerBanks.set(bank.id, bank);
    });

    prefundedAccounts.forEach(account => {
      this.data.prefundedAccounts.set(account.id, account);
    });

    // Initialize empty transaction arrays
    this.data.transactions.set(user1.id, []);
    this.data.transactions.set(user2.id, []);
    this.data.transactions.set(admin.id, []);

    // Initialize empty shadow entry arrays
    this.data.shadowEntries.set(account1.id, []);
    this.data.shadowEntries.set(account2.id, []);
    this.data.shadowEntries.set(adminAccount.id, []);

    console.log('Sample data initialized successfully');
  }

  // User operations
  getUser(id: string): User | null {
    return this.data.users.get(id) || null;
  }

  getAllUsers(): User[] {
    return Array.from(this.data.users.values());
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
    return this.data.accounts.get(id) || null;
  }

  getAllAccounts(): Account[] {
    return Array.from(this.data.accounts.values());
  }

  updateAccountBalance(id: string, balance: number): boolean {
    const account = this.data.accounts.get(id);
    if (!account) return false;

    const oldBalance = account.balance;
    account.balance = balance;
    
    this.auditLog('accounts', id, 'UPDATE_BALANCE', { balance: oldBalance }, { balance });
    return true;
  }

  // Partner Bank operations
  getPartnerBank(id: string): PartnerBank | null {
    return this.data.partnerBanks.get(id) || null;
  }

  getAllPartnerBanks(): PartnerBank[] {
    return Array.from(this.data.partnerBanks.values());
  }

  updatePartnerBankStatus(id: string, status: PartnerBankStatus): boolean {
    const bank = this.data.partnerBanks.get(id);
    if (!bank) return false;

    const oldStatus = bank.status;
    bank.status = status;
    bank.lastChecked = new Date().toISOString();
    
    this.auditLog('partner_banks', id, 'UPDATE_STATUS', { status: oldStatus }, { status });
    return true;
  }

  // Transaction operations
  getTransactions(userId: string): Transaction[] {
    return this.data.transactions.get(userId) || [];
  }

  getAllTransactions(): Transaction[] {
    const allTransactions: Transaction[] = [];
    for (const transactions of this.data.transactions.values()) {
      allTransactions.push(...transactions);
    }
    return allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateId('tx'),
      createdAt: new Date().toISOString(),
    };

    const userTransactions = this.data.transactions.get(transaction.userId) || [];
    userTransactions.unshift(newTransaction);
    this.data.transactions.set(transaction.userId, userTransactions);

    this.auditLog('transactions', newTransaction.id, 'CREATE', {}, newTransaction);
    return newTransaction;
  }

  // Shadow Entry operations
  getShadowEntries(accountId: string): ShadowEntry[] {
    return this.data.shadowEntries.get(accountId) || [];
  }

  createShadowEntry(entry: Omit<ShadowEntry, 'id' | 'createdAt'>): ShadowEntry {
    const newEntry: ShadowEntry = {
      ...entry,
      id: this.generateId('shadow'),
      createdAt: new Date().toISOString(),
    };

    const accountEntries = this.data.shadowEntries.get(entry.accountId) || [];
    accountEntries.unshift(newEntry);
    this.data.shadowEntries.set(entry.accountId, accountEntries);

    this.auditLog('shadow_entries', newEntry.id, 'CREATE', {}, newEntry);
    return newEntry;
  }

  updateShadowEntryStatus(id: string, status: ShadowEntryStatus): boolean {
    for (const [accountId, entries] of this.data.shadowEntries.entries()) {
      const entryIndex = entries.findIndex(entry => entry.id === id);
      if (entryIndex !== -1) {
        const oldStatus = entries[entryIndex].status;
        entries[entryIndex].status = status;
        entries[entryIndex].updatedAt = new Date().toISOString();
        
        this.auditLog('shadow_entries', id, 'UPDATE_STATUS', { status: oldStatus }, { status });
        return true;
      }
    }
    return false;
  }

  // Prefunded Account operations
  getAllPrefundedAccounts(): PrefundedAccount[] {
    return Array.from(this.data.prefundedAccounts.values());
  }

  getPrefundedAccount(id: string): PrefundedAccount | null {
    return this.data.prefundedAccounts.get(id) || null;
  }

  createPrefundedAccount(account: Omit<PrefundedAccount, 'id' | 'createdAt'>): PrefundedAccount {
    const newAccount: PrefundedAccount = {
      ...account,
      id: this.generateId('pfa'),
      createdAt: new Date().toISOString(),
    };

    this.data.prefundedAccounts.set(newAccount.id, newAccount);
    this.auditLog('prefunded_accounts', newAccount.id, 'CREATE', {}, newAccount);
    return newAccount;
  }

  updatePrefundedAccountBalance(id: string, balance: number): boolean {
    const account = this.data.prefundedAccounts.get(id);
    if (!account) return false;

    const oldBalance = account.balance;
    account.balance = balance;
    
    // Update status based on balance
    if (balance <= 0) {
      account.status = 'DEPLETED';
    } else if (balance < 10000000) { // Less than 10M
      account.status = 'LOW';
    } else {
      account.status = 'ACTIVE';
    }
    
    this.auditLog('prefunded_accounts', id, 'UPDATE_BALANCE', { balance: oldBalance }, { balance });
    return true;
  }

  // Transfer Log operations
  getAllTransferLogs(): TransferLog[] {
    return Array.from(this.data.transferLogs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getTransferLog(id: string): TransferLog | null {
    return this.data.transferLogs.get(id) || null;
  }

  createTransferLog(log: Omit<TransferLog, 'id' | 'createdAt'>): TransferLog {
    const newLog: TransferLog = {
      ...log,
      id: this.generateId('tl'),
      createdAt: new Date().toISOString(),
    };

    this.data.transferLogs.set(newLog.id, newLog);
    this.auditLog('transfer_logs', newLog.id, 'CREATE', {}, newLog);
    return newLog;
  }

  updateTransferLogBackendStatus(id: string, status: 'PENDING' | 'SETTLED' | 'FAILED' | 'REVERSED', settlementReference?: string): boolean {
    const log = this.data.transferLogs.get(id);
    if (!log) return false;

    const oldStatus = log.backendStatus;
    log.backendStatus = status;
    log.settledAt = status === 'SETTLED' ? new Date().toISOString() : undefined;
    log.settlementReference = settlementReference;
    
    this.auditLog('transfer_logs', id, 'UPDATE_BACKEND_STATUS', { backendStatus: oldStatus }, { backendStatus: status });
    return true;
  }

  // Utility operations
  clearAllData() {
    this.data.users.clear();
    this.data.accounts.clear();
    this.data.partnerBanks.clear();
    this.data.transactions.clear();
    this.data.shadowEntries.clear();
    this.data.auditLogs = [];
    this.data.prefundedAccounts.clear();
    this.data.transferLogs.clear();
  }

  exportData() {
    return {
      users: Array.from(this.data.users.entries()),
      accounts: Array.from(this.data.accounts.entries()),
      partnerBanks: Array.from(this.data.partnerBanks.entries()),
      transactions: Array.from(this.data.transactions.entries()),
      shadowEntries: Array.from(this.data.shadowEntries.entries()),
      auditLogs: this.data.auditLogs,
      prefundedAccounts: Array.from(this.data.prefundedAccounts.entries()),
      transferLogs: Array.from(this.data.transferLogs.entries()),
    };
  }
}

// Export singleton instance
export const productionDb = new ProductionDatabase();
