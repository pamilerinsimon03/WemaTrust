import { NextResponse } from 'next/server';
import { dbOperations } from '@/lib/database';
import type { AdminLogsData } from '@/lib/types';

export async function GET() {
  try {
    // Get all transfer logs
    const transferLogs = dbOperations.getAllTransferLogs();
    
    // Get all prefunded accounts
    const prefundedAccounts = dbOperations.getAllPrefundedAccounts();
    
    // Calculate statistics
    const totalTransfers = transferLogs.length;
    const instantCredits = transferLogs.filter(log => log.instantStatus === 'CREDITED').length;
    const pendingSettlements = transferLogs.filter(log => log.backendStatus === 'PENDING').length;
    const failedSettlements = transferLogs.filter(log => log.backendStatus === 'FAILED').length;
    
    // Calculate success rates
    const wemaToWemaTransfers = transferLogs.filter(log => log.transferType === 'WEMA_TO_WEMA');
    const wemaToOtherTransfers = transferLogs.filter(log => log.transferType === 'WEMA_TO_OTHER');
    
    const wemaToWemaSuccessRate = wemaToWemaTransfers.length > 0 
      ? (wemaToWemaTransfers.filter(log => log.backendStatus === 'SETTLED').length / wemaToWemaTransfers.length) * 100
      : 100;
      
    const wemaToOtherSuccessRate = wemaToOtherTransfers.length > 0
      ? (wemaToOtherTransfers.filter(log => log.backendStatus === 'SETTLED').length / wemaToOtherTransfers.length) * 100
      : 100;
    
    // Calculate average settlement time
    const settledTransfers = transferLogs.filter(log => log.backendStatus === 'SETTLED' && log.settledAt);
    const averageSettlementTime = settledTransfers.length > 0
      ? settledTransfers.reduce((acc, log) => {
          const createdAt = new Date(log.createdAt).getTime();
          const settledAt = new Date(log.settledAt!).getTime();
          return acc + (settledAt - createdAt);
        }, 0) / settledTransfers.length / 1000 // Convert to seconds
      : 0;
    
    // Determine prefunded account health
    const activeAccounts = prefundedAccounts.filter(acc => acc.status === 'ACTIVE').length;
    const totalPrefundedAccounts = prefundedAccounts.length;
    const prefundedAccountHealth = 
      activeAccounts / totalPrefundedAccounts >= 0.75 ? 'HEALTHY' :
      activeAccounts / totalPrefundedAccounts >= 0.5 ? 'WARNING' : 'CRITICAL';
    
    // Get recent transfers (last 50)
    const recentTransfers = transferLogs.slice(0, 50);
    
    const adminLogsData: AdminLogsData = {
      totalTransfers,
      instantCredits,
      pendingSettlements,
      failedSettlements,
      prefundedAccounts,
      recentTransfers,
      systemHealth: {
        wemaToWemaSuccessRate,
        wemaToOtherSuccessRate,
        averageSettlementTime,
        prefundedAccountHealth: prefundedAccountHealth as 'HEALTHY' | 'WARNING' | 'CRITICAL',
      },
    };
    
    return NextResponse.json(adminLogsData);
  } catch (error) {
    console.error('Admin Logs API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
