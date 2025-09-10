'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  TrendingUp,
  Banknote,
  ArrowRightLeft
} from 'lucide-react';
import type { AdminLogsData, TransferLog, PrefundedAccount } from '@/lib/types';

interface AdminLogsDashboardProps {
  userId: string;
}

export function AdminLogsDashboard({ userId }: AdminLogsDashboardProps) {
  const [data, setData] = useState<AdminLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/logs');
      if (response.ok) {
        const logsData = await response.json();
        setData(logsData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch admin logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load admin logs data</p>
        <Button onClick={fetchData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CREDITED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Credited</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'SETTLED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Settled</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'REVERSED':
        return <Badge variant="outline">Reversed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPrefundedAccountStatusBadge = (status: 'ACTIVE' | 'LOW' | 'DEPLETED') => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'LOW':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low</Badge>;
      case 'DEPLETED':
        return <Badge variant="destructive">Depleted</Badge>;
    }
  };

  const getHealthBadge = (health: 'HEALTHY' | 'WARNING' | 'CRITICAL') => {
    switch (health) {
      case 'HEALTHY':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'WARNING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive">Critical</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Logs Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of instant transfers and backend settlements
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransfers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time transfers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instant Credits</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.instantCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((data.instantCredits / Math.max(data.totalTransfers, 1)) * 100).toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Settlements</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.pendingSettlements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting backend resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getHealthBadge(data.systemHealth.prefundedAccountHealth)}</div>
            <p className="text-xs text-muted-foreground">Prefunded account status</p>
          </CardContent>
        </Card>
      </div>

      {/* System Performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Wema-to-Wema Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.systemHealth.wemaToWemaSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Internal ledger transfers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Wema-to-Other Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.systemHealth.wemaToOtherSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Prefunded account transfers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Settlement Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(data.systemHealth.averageSettlementTime)}
            </div>
            <p className="text-xs text-muted-foreground">Backend processing time</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Data */}
      <Tabs defaultValue="transfers" className="w-full">
        <TabsList>
          <TabsTrigger value="transfers">Recent Transfers</TabsTrigger>
          <TabsTrigger value="prefunded">Prefunded Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transfer Logs</CardTitle>
              <CardDescription>
                Shows instant credits and backend settlement status for transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentTransfers.map((log: TransferLog) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{log.transferType}</Badge>
                        <span className="font-mono text-sm">{log.transactionId}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">{log.senderName}</p>
                        <p className="text-muted-foreground">{log.senderAccount}</p>
                      </div>
                      <div>
                        <p className="font-medium">{log.recipientName}</p>
                        <p className="text-muted-foreground">{log.recipientAccount}</p>
                      </div>
                      <div>
                        <p className="font-bold">{formatCurrency(log.amount)}</p>
                        <p className="text-muted-foreground">Amount</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">Instant:</span>
                          {getStatusBadge(log.instantStatus)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">Backend:</span>
                          {getStatusBadge(log.backendStatus)}
                        </div>
                      </div>
                    </div>

                    {log.prefundedAccountUsed && (
                      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        Used prefunded account: {log.prefundedAccountUsed} 
                        (Balance after: {formatCurrency(log.prefundedAccountBalance || 0)})
                      </div>
                    )}

                    {log.notes && (
                      <div className="text-xs text-muted-foreground">
                        {log.notes}
                      </div>
                    )}
                  </div>
                ))}

                {data.recentTransfers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transfers recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prefunded" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prefunded Account Status</CardTitle>
              <CardDescription>
                Liquidity pools maintained in partner banks for instant transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {data.prefundedAccounts.map((account: PrefundedAccount) => (
                  <div key={account.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Banknote className="h-4 w-4" />
                        <span className="font-medium">{account.bankName}</span>
                        {getPrefundedAccountStatusBadge(account.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {account.accountNumber}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-bold text-lg">{formatCurrency(account.balance)}</p>
                        <p className="text-muted-foreground">Available Balance</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Replenished</p>
                        <p>{new Date(account.lastReplenished).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{new Date(account.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="capitalize">{account.status.toLowerCase()}</p>
                      </div>
                    </div>

                    {account.status === 'LOW' && (
                      <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                        ⚠️ Balance is running low. Consider replenishing soon.
                      </div>
                    )}

                    {account.status === 'DEPLETED' && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        🚨 Account depleted. Transfers to this bank may fail.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
