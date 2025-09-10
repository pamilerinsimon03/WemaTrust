'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Account, PartnerBank, ServerEvent, Transaction, User } from '@/lib/types';
import { AccountBalance } from './account-balance';
import { TransferForm } from './transfer-form';
import { PartnerStatus } from './partner-status';
import { TransactionHistory } from './transaction-history';
import { useToast } from '@/hooks/use-toast';
import { updatePartnerBankStatus, getPartnerBanks } from '@/lib/store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from './ui/button';
import { Network, SlidersHorizontal } from 'lucide-react';
import type { PartnerBankStatus } from '@/lib/types';

function AdminTool({ banks, onStatusChange }: { banks: PartnerBank[], onStatusChange: (bankId: string, status: PartnerBankStatus) => void }) {
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<PartnerBankStatus>('UP');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    setIsSubmitting(true);
    // In a real app, this would be a server action.
    // For the demo, we call the store directly and trigger a client-side update.
    updatePartnerBankStatus(selectedBank, selectedStatus);
    onStatusChange(selectedBank, selectedStatus);
    setIsSubmitting(false);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="text-primary" />
          <span>Admin: Network Simulator</span>
        </CardTitle>
        <CardDescription>
          Manually change the status of partner banks to test system resilience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-bank-select">Bank</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank} required>
              <SelectTrigger id="admin-bank-select">
                <SelectValue placeholder="Select a bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-status-select">New Status</Label>
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as PartnerBankStatus)} required>
              <SelectTrigger id="admin-status-select">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UP">UP (Healthy)</SelectItem>
                <SelectItem value="SLOW">SLOW (Degraded)</SelectItem>
                <SelectItem value="DOWN">DOWN (Offline)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !selectedBank}>
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


interface DashboardClientProps {
  user: User;
  initialAccount: Account | null;
  initialPartnerBanks: PartnerBank[];
  initialTransactions: Transaction[];
}

export function DashboardClient({
  user,
  initialAccount,
  initialPartnerBanks,
  initialTransactions,
}: DashboardClientProps) {
  const [account, setAccount] = useState<Account | null>(initialAccount);
  const [partnerBanks, setPartnerBanks] = useState<PartnerBank[]>(initialPartnerBanks);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const { toast } = useToast();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to refresh account data
  const refreshAccountData = useCallback(async () => {
    console.log('[REFRESH] Starting account data refresh for user:', user.id);
    
    try {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Immediate refresh without debouncing for now
      const accountResponse = await fetch(`/api/accounts?userId=${user.id}`);
      console.log('[REFRESH] Account response status:', accountResponse.status);
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        console.log('[REFRESH] Account data received:', accountData);
        console.log('[REFRESH] Account balance:', accountData.balance);
        console.log('[REFRESH] Current account state:', account);
        setAccount(accountData);
        console.log('[REFRESH] Account state updated');
        
        // Force a re-render by updating a dummy state
        setTimeout(() => {
          console.log('[REFRESH] Forcing re-render after account update');
        }, 100);
      } else {
        console.error('[REFRESH] Account API error:', accountResponse.status);
      }

      const transactionsResponse = await fetch(`/api/transactions?userId=${user.id}`);
      console.log('[REFRESH] Transactions response status:', transactionsResponse.status);
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        console.log('[REFRESH] Transactions data received:', transactionsData);
        const userTransactions = Array.isArray(transactionsData) 
          ? transactionsData 
          : transactionsData.transactions || [];
        console.log('[REFRESH] User transactions:', userTransactions);
        console.log('[REFRESH] Current transactions state:', transactions);
        setTransactions(userTransactions);
        console.log('[REFRESH] Transactions state updated');
      } else {
        console.error('[REFRESH] Transactions API error:', transactionsResponse.status);
      }
    } catch (error) {
      console.error('[REFRESH] Error refreshing account data:', error);
    }
  }, [user.id]);

  // Debug effect to watch state changes
  useEffect(() => {
    console.log('[STATE DEBUG] Account state changed:', account);
  }, [account]);

  useEffect(() => {
    console.log('[STATE DEBUG] Transactions state changed:', transactions);
  }, [transactions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      const serverEvent = JSON.parse(event.data) as ServerEvent;
      
      // Filter events to this user.
      if ('userId' in serverEvent.data && serverEvent.data.userId !== user.id) {
          return;
      }

      switch (serverEvent.type) {
        case 'balance_updated':
          if (serverEvent.data.accountId === account?.id) {
            setAccount((prev) => prev ? { ...prev, balance: serverEvent.data.balance } : null);
          }
          break;
        case 'shadow_created':
          if (serverEvent.data.accountId === account?.id) {
            setAccount((prev) => prev ? {
              ...prev,
              shadowEntries: [serverEvent.data, ...prev.shadowEntries],
            } : null);
            toast({
              title: 'Incoming Transfer',
              description: `Receiving ${serverEvent.data.amount.toLocaleString('en-NG', {style: 'currency', currency: 'NGN'})}. Status is pending.`,
            });
          }
          break;
        case 'shadow_updated':
           if (serverEvent.data.accountId === account?.id) {
            const isCleared = serverEvent.data.status === 'cleared';
            
            setAccount((prev) => {
                if (!prev) return null;
                const newShadowEntries = isCleared
                ? prev.shadowEntries.filter((e) => e.id !== serverEvent.data.id)
                : prev.shadowEntries.map((e) =>
                    e.id === serverEvent.data.id ? { ...e, ...serverEvent.data } : e
                    );
                return { ...prev, shadowEntries: newShadowEntries };
            });

            if(serverEvent.data.status === 'cleared') {
                toast({
                title: 'Transaction Cleared',
                description: `Transfer of ${serverEvent.data.amount.toLocaleString('en-NG', {style: 'currency', currency: 'NGN'})} has been credited.`,
                });
            } else if (serverEvent.data.status === 'failed') {
                toast({
                variant: 'destructive',
                title: 'Transaction Failed',
                description: `Incoming transfer of ${serverEvent.data.amount.toLocaleString('en-NG', {style: 'currency', currency: 'NGN'})} failed.`,
                });
            }
           }
          break;
        case 'new_transaction':
            setTransactions((prev) => [serverEvent.data, ...prev]);
            break;
        case 'partner_status_changed':
          // This is a global event, no user filter needed
          setPartnerBanks((prev) =>
            prev.map((bank) =>
              bank.id === serverEvent.data.id ? {...bank, status: serverEvent.data.status} : bank
            )
          );
          if (user.roles.includes('user') && serverEvent.data.status !== 'UP') {
             toast({
              variant: serverEvent.data.status === 'DOWN' ? 'destructive' : 'default',
              title: 'Partner Bank Status Change',
              description: `${serverEvent.data.name} is now ${serverEvent.data.status}.`,
            });
          }
          break;
      }
    };
    
    eventSource.onerror = () => {
        console.error("SSE connection error. Reconnecting...");
    };

    return () => {
      eventSource.close();
    };
  }, [toast, account, user.id, user.roles]);

  const handleAdminStatusChange = (bankId: string, status: PartnerBankStatus) => {
    // This function is called after the store is updated
    // We just need to re-fetch the banks to update the UI
    setPartnerBanks(getPartnerBanks());
  };

  const isAdmin = user.roles.includes('admin');

  return (
      <div className="grid gap-6 md:gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6 md:space-y-8">
              {account ? <AccountBalance account={account} /> : 
                isAdmin && <AdminTool banks={partnerBanks} onStatusChange={handleAdminStatusChange} />
              }
              {account && <TransferForm user={user} partnerBanks={partnerBanks} onTransferSuccess={refreshAccountData} />}
          </div>
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
              <PartnerStatus partnerBanks={partnerBanks} />
              <TransactionHistory transactions={transactions} />
          </div>
      </div>
  );
}
