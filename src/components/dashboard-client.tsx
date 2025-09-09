'use client';

import { useState, useEffect } from 'react';
import type { Account, PartnerBank, ServerEvent, Transaction, User } from '@/lib/types';
import { AccountBalance } from './account-balance';
import { TransferForm } from './transfer-form';
import { PartnerStatus } from './partner-status';
import { TransactionHistory } from './transaction-history';
import { useToast } from '@/hooks/use-toast';

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

  const isUser = user.roles.includes('user');
  const isAdmin = user.roles.includes('admin');

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      const serverEvent = JSON.parse(event.data) as ServerEvent;
      
      // Ensure events are for the current user's account if applicable
      if ('accountId' in serverEvent.data && account && serverEvent.data.accountId !== account.id) {
          return;
      }

      switch (serverEvent.type) {
        case 'balance_updated':
          setAccount((prev) => prev ? { ...prev, balance: serverEvent.data.balance } : null);
          break;
        case 'shadow_created':
          setAccount((prev) => prev ? {
            ...prev,
            shadowEntries: [serverEvent.data, ...prev.shadowEntries],
          } : null);
          toast({
            title: 'Pending Transaction',
            description: `Incoming transfer of ${serverEvent.data.amount.toLocaleString()} is pending.`,
          });
          break;
        case 'shadow_updated':
          setAccount((prev) => {
            if (!prev) return null;
            const isCleared = serverEvent.data.status === 'cleared';
            const shadowEntries = isCleared
              ? prev.shadowEntries.filter((e) => e.id !== serverEvent.data.id)
              : prev.shadowEntries.map((e) =>
                  e.id === serverEvent.data.id ? serverEvent.data : e
                );
            return { ...prev, shadowEntries };
          });
          if(serverEvent.data.status === 'cleared') {
            toast({
              title: 'Transaction Cleared',
              description: `Transfer of ${serverEvent.data.amount.toLocaleString()} has been credited.`,
            });
          } else if (serverEvent.data.status === 'failed') {
            toast({
              variant: 'destructive',
              title: 'Transaction Failed',
              description: `Transfer of ${serverEvent.data.amount.toLocaleString()} failed.`,
            });
          }
          break;
        case 'new_transaction':
          setTransactions((prev) => [serverEvent.data, ...prev]);
          break;
        case 'partner_status_changed':
          setPartnerBanks((prev) =>
            prev.map((bank) =>
              bank.id === serverEvent.data.id ? serverEvent.data : bank
            )
          );
          if (serverEvent.data.status !== 'UP') {
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
        // EventSource automatically tries to reconnect.
    };

    return () => {
      eventSource.close();
    };
  }, [toast, account]);

  return (
    <div className="grid gap-6 md:gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-6 md:space-y-8">
        {isUser && account && <AccountBalance account={account} />}
        {isUser && <TransferForm partnerBanks={partnerBanks} />}
      </div>
      <div className="lg:col-span-2 space-y-6 md:space-y-8">
        {(isAdmin || isUser) && <PartnerStatus partnerBanks={partnerBanks} isAdmin={isAdmin} />}
        {isUser && <TransactionHistory transactions={transactions} />}
      </div>
    </div>
  );
}
