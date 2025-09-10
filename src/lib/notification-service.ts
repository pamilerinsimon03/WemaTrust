import { dbOperations } from './database';
import sseEmitter from './events';

interface NotificationTemplate {
  id: string;
  type: 'sms' | 'push' | 'email';
  template: string;
  variables: string[];
}

interface NotificationEvent {
  id: string;
  userId: string;
  type: 'sms' | 'push' | 'email';
  message: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, any>;
}

class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private notificationHistory: NotificationEvent[] = [];

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'transfer_pending',
        type: 'sms',
        template: 'Dear {userName}, your transfer of {amount} to {recipientAccount} is pending. Ref: {txnRef}. WemaTrust',
        variables: ['userName', 'amount', 'recipientAccount', 'txnRef'],
      },
      {
        id: 'transfer_success',
        type: 'sms',
        template: 'Dear {userName}, your transfer of {amount} to {recipientAccount} was successful. Ref: {txnRef}. WemaTrust',
        variables: ['userName', 'amount', 'recipientAccount', 'txnRef'],
      },
      {
        id: 'transfer_failed',
        type: 'sms',
        template: 'Dear {userName}, your transfer of {amount} to {recipientAccount} failed. Ref: {txnRef}. Contact support: 0700-WEMATRUST. WemaTrust',
        variables: ['userName', 'amount', 'recipientAccount', 'txnRef'],
      },
      {
        id: 'incoming_transfer_pending',
        type: 'sms',
        template: 'Dear {userName}, you have an incoming transfer of {amount} from {senderBank}. Ref: {txnRef}. WemaTrust',
        variables: ['userName', 'amount', 'senderBank', 'txnRef'],
      },
      {
        id: 'incoming_transfer_cleared',
        type: 'sms',
        template: 'Dear {userName}, your account has been credited with {amount} from {senderBank}. Ref: {txnRef}. New balance: {newBalance}. WemaTrust',
        variables: ['userName', 'amount', 'senderBank', 'txnRef', 'newBalance'],
      },
      {
        id: 'incoming_transfer_failed',
        type: 'sms',
        template: 'Dear {userName}, incoming transfer of {amount} from {senderBank} failed. Ref: {txnRef}. WemaTrust',
        variables: ['userName', 'amount', 'senderBank', 'txnRef'],
      },
      {
        id: 'bank_status_change',
        type: 'push',
        template: '{bankName} is now {status}. Transfers to this bank may be affected.',
        variables: ['bankName', 'status'],
      },
      {
        id: 'system_alert',
        type: 'push',
        template: 'System Alert: {message}. We are working to resolve this issue.',
        variables: ['message'],
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Send a notification using a template
   */
  async sendNotification(
    templateId: string,
    userId: string,
    variables: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<NotificationEvent> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const user = dbOperations.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Replace template variables
    let message = template.template;
    template.variables.forEach(variable => {
      const value = variables[variable];
      if (value !== undefined) {
        message = message.replace(`{${variable}}`, String(value));
      }
    });

    const notification: NotificationEvent = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: template.type,
      message,
      timestamp: new Date().toISOString(),
      status: 'pending',
      metadata,
    };

    // Simulate sending notification
    await this.simulateNotificationSending(notification);

    // Store in history
    this.notificationHistory.push(notification);

    // Emit real-time event for push notifications
    if (template.type === 'push') {
      sseEmitter.emit('event', {
        type: 'notification',
        data: {
          userId,
          notification: {
            id: notification.id,
            message: notification.message,
            timestamp: notification.timestamp,
            type: notification.type,
          },
        },
      });
    }

    return notification;
  }

  /**
   * Simulate notification sending with realistic delays and failures
   */
  private async simulateNotificationSending(notification: NotificationEvent): Promise<void> {
    // Simulate network delay
    const delay = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures (5% failure rate)
    const success = Math.random() > 0.05;
    notification.status = success ? 'sent' : 'failed';

    if (notification.type === 'sms') {
      console.log(`[SMS SIMULATION] ${notification.status.toUpperCase()}: ${notification.message}`);
    } else if (notification.type === 'push') {
      console.log(`[PUSH SIMULATION] ${notification.status.toUpperCase()}: ${notification.message}`);
    }
  }

  /**
   * Send transfer notifications
   */
  async sendTransferNotifications(
    userId: string,
    amount: number,
    recipientAccount: string,
    txnRef: string,
    status: 'pending' | 'success' | 'failed',
    recipientBank?: string
  ): Promise<void> {
    const user = dbOperations.getUser(userId);
    if (!user) return;

    const variables = {
      userName: user.name,
      amount: amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
      recipientAccount,
      txnRef,
    };

    try {
      switch (status) {
        case 'pending':
          await this.sendNotification('transfer_pending', userId, variables);
          break;
        case 'success':
          await this.sendNotification('transfer_success', userId, variables);
          break;
        case 'failed':
          await this.sendNotification('transfer_failed', userId, variables);
          break;
      }
    } catch (error) {
      console.error(`Failed to send transfer notification to ${userId}:`, error);
    }
  }

  /**
   * Send incoming transfer notifications
   */
  async sendIncomingTransferNotifications(
    userId: string,
    amount: number,
    senderBank: string,
    txnRef: string,
    status: 'pending' | 'cleared' | 'failed'
  ): Promise<void> {
    const user = dbOperations.getUser(userId);
    if (!user) return;

    const account = user.accountId ? dbOperations.getAccount(user.accountId) : null;
    const variables = {
      userName: user.name,
      amount: amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
      senderBank,
      txnRef,
      newBalance: account ? account.balance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) : 'N/A',
    };

    try {
      switch (status) {
        case 'pending':
          await this.sendNotification('incoming_transfer_pending', userId, variables);
          break;
        case 'cleared':
          await this.sendNotification('incoming_transfer_cleared', userId, variables);
          break;
        case 'failed':
          await this.sendNotification('incoming_transfer_failed', userId, variables);
          break;
      }
    } catch (error) {
      console.error(`Failed to send incoming transfer notification to ${userId}:`, error);
    }
  }

  /**
   * Send bank status change notifications to all users
   */
  async sendBankStatusChangeNotification(
    bankName: string,
    status: 'UP' | 'SLOW' | 'DOWN'
  ): Promise<void> {
    const users = dbOperations.getAllUsers();
    const variables = {
      bankName,
      status,
    };

    // Send to all users (in production, you might want to filter based on user preferences)
    for (const user of users) {
      if (user.roles.includes('user')) {
        try {
          await this.sendNotification('bank_status_change', user.id, variables);
        } catch (error) {
          console.error(`Failed to send bank status notification to ${user.id}:`, error);
        }
      }
    }
  }

  /**
   * Send system alert to all users
   */
  async sendSystemAlert(message: string): Promise<void> {
    const users = dbOperations.getAllUsers();
    const variables = { message };

    for (const user of users) {
      if (user.roles.includes('user')) {
        try {
          await this.sendNotification('system_alert', user.id, variables);
        } catch (error) {
          console.error(`Failed to send system alert to ${user.id}:`, error);
        }
      }
    }
  }

  /**
   * Get notification history for a user
   */
  getUserNotifications(userId: string, limit: number = 50): NotificationEvent[] {
    return this.notificationHistory
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get notification statistics
   */
  getStatistics(): {
    totalNotifications: number;
    sentCount: number;
    failedCount: number;
    pendingCount: number;
    byType: Record<string, number>;
  } {
    const total = this.notificationHistory.length;
    const sent = this.notificationHistory.filter(n => n.status === 'sent').length;
    const failed = this.notificationHistory.filter(n => n.status === 'failed').length;
    const pending = this.notificationHistory.filter(n => n.status === 'pending').length;

    const byType = this.notificationHistory.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalNotifications: total,
      sentCount: sent,
      failedCount: failed,
      pendingCount: pending,
      byType,
    };
  }

  /**
   * Add a custom template
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get all available templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export for use in other modules
export { NotificationService };
export type { NotificationEvent, NotificationTemplate };
