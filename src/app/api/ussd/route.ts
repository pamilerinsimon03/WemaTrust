import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbOperations } from '@/lib/database';
import { nipSimulation } from '@/lib/nip-simulation';

const ussdSchema = z.object({
  msisdn: z.string().min(10), // Phone number
  sessionId: z.string().min(1),
  text: z.string().optional(), // USSD text input
  serviceCode: z.string().optional(), // USSD service code
});

interface UssdResponse {
  response: string;
  continueSession: boolean;
}

class UssdService {
  private sessions: Map<string, { msisdn: string; step: string; data: any }> = new Map();

  /**
   * Process USSD request
   */
  async processRequest(request: {
    msisdn: string;
    sessionId: string;
    text?: string;
    serviceCode?: string;
  }): Promise<UssdResponse> {
    const { msisdn, sessionId, text, serviceCode } = request;

    // Initialize session if new
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        msisdn,
        step: 'welcome',
        data: {},
      });
    }

    const session = this.sessions.get(sessionId)!;

    // Handle different steps
    switch (session.step) {
      case 'welcome':
        return this.handleWelcome(sessionId, text, serviceCode);
      
      case 'main_menu':
        return this.handleMainMenu(sessionId, text);
      
      case 'check_balance':
        return this.handleCheckBalance(sessionId, msisdn);
      
      case 'transaction_status':
        return this.handleTransactionStatus(sessionId, text);
      
      case 'bank_status':
        return this.handleBankStatus(sessionId);
      
      case 'help':
        return this.handleHelp(sessionId);
      
      default:
        return this.handleInvalidInput(sessionId);
    }
  }

  private handleWelcome(sessionId: string, text?: string, serviceCode?: string): UssdResponse {
    const session = this.sessions.get(sessionId)!;
    
    if (serviceCode === '*123#' || text === '') {
      session.step = 'main_menu';
      return {
        response: `Welcome to WemaTrust Banking
1. Check Balance
2. Transaction Status
3. Bank Status
4. Help
0. Exit`,
        continueSession: true,
      };
    }
    
    return this.handleInvalidInput(sessionId);
  }

  private handleMainMenu(sessionId: string, text?: string): UssdResponse {
    const session = this.sessions.get(sessionId)!;
    
    switch (text) {
      case '1':
        session.step = 'check_balance';
        return {
          response: 'Please enter your PIN to check balance:',
          continueSession: true,
        };
      
      case '2':
        session.step = 'transaction_status';
        return {
          response: 'Please enter transaction reference number:',
          continueSession: true,
        };
      
      case '3':
        session.step = 'bank_status';
        return this.handleBankStatus(sessionId);
      
      case '4':
        session.step = 'help';
        return this.handleHelp(sessionId);
      
      case '0':
        this.sessions.delete(sessionId);
        return {
          response: 'Thank you for using WemaTrust Banking. Goodbye!',
          continueSession: false,
        };
      
      default:
        return this.handleInvalidInput(sessionId);
    }
  }

  private handleCheckBalance(sessionId: string, msisdn: string): UssdResponse {
    const session = this.sessions.get(sessionId)!;
    
    // Find user by phone number (simplified - in real app, you'd have phone mapping)
    const users = dbOperations.getAllUsers();
    const user = users.find(u => u.accountId); // Simplified lookup
    
    if (!user || !user.accountId) {
      this.sessions.delete(sessionId);
      return {
        response: 'Account not found. Please contact customer service.',
        continueSession: false,
      };
    }

    const account = dbOperations.getAccount(user.accountId);
    if (!account) {
      this.sessions.delete(sessionId);
      return {
        response: 'Account error. Please contact customer service.',
        continueSession: false,
      };
    }

    const availableBalance = account.balance;
    const shadowBalance = account.shadowEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalBalance = availableBalance + shadowBalance;

    this.sessions.delete(sessionId);
    return {
      response: `Account Balance:
Available: ${availableBalance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
Pending: ${shadowBalance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
Total: ${totalBalance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}

Thank you for using WemaTrust Banking.`,
      continueSession: false,
    };
  }

  private handleTransactionStatus(sessionId: string, text?: string): UssdResponse {
    const session = this.sessions.get(sessionId)!;
    
    if (!text || text.length < 5) {
      return {
        response: 'Please enter a valid transaction reference number:',
        continueSession: true,
      };
    }

    // Check transaction in database
    const transaction = dbOperations.getTransactionByRef(text);
    const shadowEntry = dbOperations.getShadowEntryByRef(text);

    let response = '';
    
    if (transaction) {
      response = `Transaction Status:
Ref: ${transaction.txn_ref}
Amount: ${transaction.amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
Type: ${transaction.type}
Status: ${transaction.status.toUpperCase()}
Date: ${new Date(transaction.createdAt).toLocaleString('en-NG')}`;
    } else if (shadowEntry) {
      response = `Transaction Status:
Ref: ${shadowEntry.txn_ref}
Amount: ${shadowEntry.amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
Status: ${shadowEntry.status.toUpperCase()}
Date: ${new Date(shadowEntry.createdAt).toLocaleString('en-NG')}`;
    } else {
      response = 'Transaction not found. Please check the reference number and try again.';
    }

    this.sessions.delete(sessionId);
    return {
      response: response + '\n\nThank you for using WemaTrust Banking.',
      continueSession: false,
    };
  }

  private handleBankStatus(sessionId: string): UssdResponse {
    const banks = dbOperations.getAllPartnerBanks();
    
    let response = 'Partner Bank Status:\n';
    banks.forEach(bank => {
      const statusEmoji = bank.status === 'UP' ? '✅' : bank.status === 'SLOW' ? '⚠️' : '❌';
      response += `${statusEmoji} ${bank.name}: ${bank.status}\n`;
    });

    const nipStats = nipSimulation.getStatistics();
    response += `\nSystem Status:
Pending Transactions: ${nipStats.pendingCount}
Queue Length: ${nipStats.queueLength}`;

    this.sessions.delete(sessionId);
    return {
      response: response + '\n\nThank you for using WemaTrust Banking.',
      continueSession: false,
    };
  }

  private handleHelp(sessionId: string): UssdResponse {
    this.sessions.delete(sessionId);
    return {
      response: `WemaTrust Banking Help:

*123# - Main Menu
1 - Check Balance
2 - Transaction Status
3 - Bank Status
4 - Help
0 - Exit

For support, call: 0700-WEMATRUST
Email: support@wematrust.com

Thank you for using WemaTrust Banking.`,
      continueSession: false,
    };
  }

  private handleInvalidInput(sessionId: string): UssdResponse {
    const session = this.sessions.get(sessionId)!;
    
    if (session.step === 'main_menu') {
      return {
        response: 'Invalid option. Please select 1-4 or 0 to exit:',
        continueSession: true,
      };
    }
    
    this.sessions.delete(sessionId);
    return {
      response: 'Invalid input. Please dial *123# to start again.',
      continueSession: false,
    };
  }

  /**
   * Get active sessions (for monitoring)
   */
  getActiveSessions(): Array<{ sessionId: string; msisdn: string; step: string }> {
    return Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      msisdn: session.msisdn,
      step: session.step,
    }));
  }

  /**
   * Clear expired sessions (call periodically)
   */
  clearExpiredSessions(): void {
    // In a real implementation, you'd track session timestamps and clear old ones
    // For this demo, we'll keep sessions until explicitly ended
  }
}

// Create singleton instance
const ussdService = new UssdService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = ussdSchema.parse(body);

    const response = await ussdService.processRequest(validatedData);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('USSD API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET endpoint for monitoring active sessions
export async function GET(request: Request) {
  try {
    const activeSessions = ussdService.getActiveSessions();
    return NextResponse.json({
      activeSessions,
      totalSessions: activeSessions.length,
    });
  } catch (error) {
    console.error('USSD Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
