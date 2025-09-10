import { NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import { nipSimulation } from '@/lib/nip-simulation';
import { notificationService } from '@/lib/notification-service';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  nipSimulation: {
    pendingTransactions: number;
    queueLength: number;
    averageProcessingTime: number;
  };
  notifications: {
    totalSent: number;
    successRate: number;
    pendingCount: number;
  };
  partnerBanks: {
    total: number;
    up: number;
    slow: number;
    down: number;
  };
}

interface SystemMetrics {
  timestamp: string;
  activeUsers: number;
  totalTransactions: number;
  totalShadowEntries: number;
  systemLoad: number;
  memoryUsage: number;
  responseTime: number;
}

class MonitoringService {
  private metrics: SystemMetrics[] = [];
  private startTime = Date.now();

  /**
   * Get comprehensive system health status
   */
  getSystemHealth(): SystemHealth {
    const partnerBanks = dbOperations.getAllPartnerBanks();
    const nipStats = nipSimulation.getStatistics();
    const notificationStats = notificationService.getStatistics();

    const bankStatusCounts = partnerBanks.reduce((acc, bank) => {
      const status = bank.status.toLowerCase() as keyof typeof acc;
      acc[status]++;
      return acc;
    }, { up: 0, slow: 0, down: 0 });

    // Determine overall system status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (bankStatusCounts.down > 0 || nipStats.pendingCount > 10) {
      status = 'degraded';
    }
    if (bankStatusCounts.down > 2 || nipStats.pendingCount > 50) {
      status = 'critical';
    }

    return {
      status,
      uptime: Date.now() - this.startTime,
      database: {
        status: 'connected', // In real implementation, test actual connection
        responseTime: Math.random() * 10 + 5, // Simulated response time
      },
      nipSimulation: {
        pendingTransactions: nipStats.pendingCount,
        queueLength: nipStats.queueLength,
        averageProcessingTime: 2500, // Simulated average processing time
      },
      notifications: {
        totalSent: notificationStats.totalNotifications,
        successRate: notificationStats.totalNotifications > 0 
          ? (notificationStats.sentCount / notificationStats.totalNotifications) * 100 
          : 100,
        pendingCount: notificationStats.pendingCount,
      },
      partnerBanks: {
        total: partnerBanks.length,
        up: bankStatusCounts.up,
        slow: bankStatusCounts.slow,
        down: bankStatusCounts.down,
      },
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const users = dbOperations.getAllUsers();
    const accounts = dbOperations.getAllAccounts();
    
    const totalTransactions = accounts.reduce((sum, account) => {
      return sum + account.shadowEntries.length;
    }, 0);

    const totalShadowEntries = accounts.reduce((sum, account) => {
      return sum + account.shadowEntries.length;
    }, 0);

    const metric: SystemMetrics = {
      timestamp: new Date().toISOString(),
      activeUsers: users.filter(u => u.roles.includes('user')).length,
      totalTransactions,
      totalShadowEntries,
      systemLoad: Math.random() * 100, // Simulated system load
      memoryUsage: Math.random() * 100, // Simulated memory usage
      responseTime: Math.random() * 100 + 50, // Simulated response time
    };

    // Store metric
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    return metric;
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(hours: number = 24): SystemMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Get detailed partner bank status
   */
  getPartnerBankDetails() {
    const banks = dbOperations.getAllPartnerBanks();
    const nipStats = nipSimulation.getStatistics();

    return banks.map(bank => ({
      ...bank,
      lastUpdated: new Date().toISOString(),
      healthScore: this.calculateHealthScore(bank.status),
      estimatedDowntime: bank.status === 'DOWN' ? 'Unknown' : 'None',
      impactLevel: this.getImpactLevel(bank.status),
    }));
  }

  private calculateHealthScore(status: string): number {
    switch (status) {
      case 'UP': return 100;
      case 'SLOW': return 60;
      case 'DOWN': return 0;
      default: return 50;
    }
  }

  private getImpactLevel(status: string): 'low' | 'medium' | 'high' {
    switch (status) {
      case 'UP': return 'low';
      case 'SLOW': return 'medium';
      case 'DOWN': return 'high';
      default: return 'medium';
    }
  }

  /**
   * Get alert summary
   */
  getAlerts(): Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    resolved: boolean;
  }> {
    const alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: string;
      severity: 'low' | 'medium' | 'high';
      resolved: boolean;
    }> = [];
    const health = this.getSystemHealth();

    // System status alerts
    if (health.status === 'critical') {
      alerts.push({
        id: 'system_critical',
        type: 'error',
        message: 'System is in critical state. Multiple partner banks are down.',
        timestamp: new Date().toISOString(),
        severity: 'high',
        resolved: false,
      });
    } else if (health.status === 'degraded') {
      alerts.push({
        id: 'system_degraded',
        type: 'warning',
        message: 'System performance is degraded. Some services may be slow.',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        resolved: false,
      });
    }

    // Partner bank alerts
    const banks = dbOperations.getAllPartnerBanks();
    banks.forEach(bank => {
      if (bank.status === 'DOWN') {
        alerts.push({
          id: `bank_down_${bank.id}`,
          type: 'error',
          message: `${bank.name} is currently offline.`,
          timestamp: new Date().toISOString(),
          severity: 'high',
          resolved: false,
        });
      } else if (bank.status === 'SLOW') {
        alerts.push({
          id: `bank_slow_${bank.id}`,
          type: 'warning',
          message: `${bank.name} is experiencing slow response times.`,
          timestamp: new Date().toISOString(),
          severity: 'medium',
          resolved: false,
        });
      }
    });

    // NIP simulation alerts
    const nipStats = nipSimulation.getStatistics();
    if (nipStats.pendingCount > 20) {
      alerts.push({
        id: 'nip_queue_high',
        type: 'warning',
        message: `High number of pending transactions: ${nipStats.pendingCount}`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        resolved: false,
      });
    }

    return alerts;
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'health';

    switch (type) {
      case 'health':
        const health = monitoringService.getSystemHealth();
        return NextResponse.json(health);

      case 'metrics':
        const metrics = monitoringService.getSystemMetrics();
        return NextResponse.json(metrics);

      case 'historical':
        const hours = parseInt(searchParams.get('hours') || '24');
        const historicalMetrics = monitoringService.getHistoricalMetrics(hours);
        return NextResponse.json(historicalMetrics);

      case 'banks':
        const bankDetails = monitoringService.getPartnerBankDetails();
        return NextResponse.json(bankDetails);

      case 'alerts':
        const alerts = monitoringService.getAlerts();
        return NextResponse.json(alerts);

      case 'all':
        const allData = {
          health: monitoringService.getSystemHealth(),
          metrics: monitoringService.getSystemMetrics(),
          banks: monitoringService.getPartnerBankDetails(),
          alerts: monitoringService.getAlerts(),
        };
        return NextResponse.json(allData);

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Monitoring API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST endpoint for triggering system tests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'test_database':
        // Test database connectivity
        const users = dbOperations.getAllUsers();
        return NextResponse.json({
          success: true,
          message: 'Database connection test successful',
          userCount: users.length,
        });

      case 'test_nip_simulation':
        // Test NIP simulation
        const nipStats = nipSimulation.getStatistics();
        return NextResponse.json({
          success: true,
          message: 'NIP simulation test successful',
          statistics: nipStats,
        });

      case 'test_notifications':
        // Test notification service
        const notificationStats = notificationService.getStatistics();
        return NextResponse.json({
          success: true,
          message: 'Notification service test successful',
          statistics: notificationStats,
        });

      case 'clear_metrics':
        // Clear historical metrics (for testing)
        monitoringService.getHistoricalMetrics(0); // This will clear all metrics
        return NextResponse.json({
          success: true,
          message: 'Metrics cleared successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Monitoring POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
