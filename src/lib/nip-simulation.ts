import { dbOperations } from './database';
import { processNipEventForUser } from './store';
import type { PartnerBankStatus } from './types';

interface NipSimulationConfig {
  baseDelay: number; // Base delay in milliseconds
  failureRate: number; // Failure rate (0-1)
  retryAttempts: number; // Number of retry attempts
  retryDelay: number; // Delay between retries
}

interface NipEvent {
  txn_ref: string;
  amount: number;
  status?: 'pending' | 'success' | 'failed';
  to_account: string;
  from_bank?: string;
  note?: string;
  timestamp: string;
  retryCount?: number;
}

class NipSimulationService {
  private config: NipSimulationConfig;
  private pendingEvents: Map<string, NipEvent> = new Map();
  private processingQueue: NipEvent[] = [];

  constructor(config: NipSimulationConfig = {
    baseDelay: 2000,
    failureRate: 0.1,
    retryAttempts: 3,
    retryDelay: 5000,
  }) {
    this.config = config;
    this.startProcessingQueue();
  }

  /**
   * Simulate a NIP transfer with realistic delays and failure scenarios
   */
  async simulateNipTransfer(event: Omit<NipEvent, 'timestamp' | 'retryCount'>): Promise<void> {
    const nipEvent: NipEvent = {
      ...event,
      status: event.status || 'pending',
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    console.log(`[NIP SIMULATION] Processing transfer: ${nipEvent.txn_ref} for ${nipEvent.amount} to ${nipEvent.to_account}`);

    // Add to processing queue
    this.processingQueue.push(nipEvent);
    this.pendingEvents.set(nipEvent.txn_ref, nipEvent);

    // Immediately send pending status
    await this.processEvent({ ...nipEvent, status: 'pending' });
  }

  /**
   * Process events from the queue with realistic delays
   */
  private async startProcessingQueue(): Promise<void> {
    setInterval(async () => {
      if (this.processingQueue.length === 0) return;

      const event = this.processingQueue.shift();
      if (!event) return;

      await this.processEventWithDelay(event);
    }, 1000); // Process one event per second
  }

  /**
   * Process an event with realistic delay based on bank status
   */
  private async processEventWithDelay(event: NipEvent): Promise<void> {
    const bank = event.from_bank ? dbOperations.getPartnerBank(event.from_bank) : null;
    const bankStatus = bank?.status || 'DOWN';

    // Calculate delay based on bank status
    let delay = this.config.baseDelay;
    switch (bankStatus) {
      case 'UP':
        delay = this.config.baseDelay + Math.random() * 1000; // 2-3 seconds
        break;
      case 'SLOW':
        delay = this.config.baseDelay * 2 + Math.random() * 2000; // 4-6 seconds
        break;
      case 'DOWN':
        delay = this.config.baseDelay * 5 + Math.random() * 5000; // 10-15 seconds
        break;
    }

    console.log(`[NIP SIMULATION] Delaying ${delay}ms for bank status: ${bankStatus}`);

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Determine final status based on bank health and random factors
    const finalStatus = this.determineFinalStatus(bankStatus, event.retryCount || 0);

    await this.processEvent({ ...event, status: finalStatus });
  }

  /**
   * Determine the final status based on bank health and retry count
   */
  private determineFinalStatus(bankStatus: PartnerBankStatus, retryCount: number): 'success' | 'failed' {
    // If we've exceeded retry attempts, fail
    if (retryCount >= this.config.retryAttempts) {
      return 'failed';
    }

    // Calculate success probability based on bank status
    let successProbability = 1 - this.config.failureRate;
    
    switch (bankStatus) {
      case 'UP':
        successProbability = 0.95; // 95% success rate
        break;
      case 'SLOW':
        successProbability = 0.75; // 75% success rate
        break;
      case 'DOWN':
        successProbability = 0.25; // 25% success rate
        break;
    }

    // Reduce success probability with each retry
    successProbability *= Math.pow(0.8, retryCount);

    return Math.random() < successProbability ? 'success' : 'failed';
  }

  /**
   * Process a NIP event
   */
  private async processEvent(event: NipEvent): Promise<void> {
    try {
      processNipEventForUser({
        txn_ref: event.txn_ref,
        amount: event.amount,
        status: event.status!,
        to_account: event.to_account,
        from_bank: event.from_bank,
        note: event.note,
      });

      if (event.status === 'pending') {
        console.log(`[NIP SIMULATION] Sent pending notification for ${event.txn_ref}`);
      } else if (event.status === 'success') {
        console.log(`[NIP SIMULATION] Transaction ${event.txn_ref} completed successfully`);
        this.pendingEvents.delete(event.txn_ref);
      } else if (event.status === 'failed') {
        console.log(`[NIP SIMULATION] Transaction ${event.txn_ref} failed`);
        
        // Retry logic
        const retryCount = (event.retryCount || 0) + 1;
        if (retryCount <= this.config.retryAttempts) {
          console.log(`[NIP SIMULATION] Retrying transaction ${event.txn_ref} (attempt ${retryCount})`);
          
          // Schedule retry
          setTimeout(async () => {
            const retryEvent = { ...event, retryCount };
            this.processingQueue.push(retryEvent);
          }, this.config.retryDelay);
        } else {
          console.log(`[NIP SIMULATION] Transaction ${event.txn_ref} failed after ${retryCount} attempts`);
          this.pendingEvents.delete(event.txn_ref);
        }
      }
    } catch (error) {
      console.error(`[NIP SIMULATION] Error processing event ${event.txn_ref}:`, error);
    }
  }

  /**
   * Get status of pending transactions
   */
  getPendingTransactions(): NipEvent[] {
    return Array.from(this.pendingEvents.values());
  }

  /**
   * Get statistics about the simulation
   */
  getStatistics(): {
    pendingCount: number;
    queueLength: number;
    config: NipSimulationConfig;
  } {
    return {
      pendingCount: this.pendingEvents.size,
      queueLength: this.processingQueue.length,
      config: this.config,
    };
  }

  /**
   * Update simulation configuration
   */
  updateConfig(newConfig: Partial<NipSimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[NIP SIMULATION] Configuration updated:`, this.config);
  }

  /**
   * Simulate system-wide issues (for testing)
   */
  async simulateSystemIssue(duration: number = 30000): Promise<void> {
    console.log(`[NIP SIMULATION] Simulating system issue for ${duration}ms`);
    
    // Increase delays and failure rates
    const originalConfig = { ...this.config };
    this.config.baseDelay *= 3;
    this.config.failureRate = Math.min(this.config.failureRate * 2, 0.8);

    // Restore after duration
    setTimeout(() => {
      this.config = originalConfig;
      console.log(`[NIP SIMULATION] System issue resolved`);
    }, duration);
  }

  /**
   * Simulate partner bank outage
   */
  async simulateBankOutage(bankId: string, duration: number = 60000): Promise<void> {
    console.log(`[NIP SIMULATION] Simulating ${bankId} outage for ${duration}ms`);
    
    const bank = dbOperations.getPartnerBank(bankId);
    if (!bank) {
      console.error(`[NIP SIMULATION] Bank ${bankId} not found`);
      return;
    }

    const originalStatus = bank.status;
    dbOperations.updatePartnerBankStatus(bankId, 'DOWN');

    // Restore after duration
    setTimeout(() => {
      dbOperations.updatePartnerBankStatus(bankId, originalStatus);
      console.log(`[NIP SIMULATION] ${bankId} outage resolved`);
    }, duration);
  }
}

// Create singleton instance
export const nipSimulation = new NipSimulationService();

// Export for use in API routes
export { NipSimulationService };
export type { NipEvent, NipSimulationConfig };
