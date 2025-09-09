'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Account } from '@/lib/types';
import { Wallet, Hourglass, CircleCheck, CircleX } from 'lucide-react';
import { StatusBadge } from './status-badge';

interface AccountBalanceProps {
  account: Account;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export function AccountBalance({ account }: AccountBalanceProps) {
  const pendingShadowValue = account.shadowEntries
    .filter((e) => e.status === 'pending')
    .reduce((sum, entry) => sum + entry.amount, 0);
  
  const totalBalance = account.balance + pendingShadowValue;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="text-primary" />
          <span>Account Overview</span>
        </CardTitle>
        <CardDescription>
          {account.name} - {account.accountNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center bg-primary/5 dark:bg-primary/10 p-6 rounded-lg">
          <p className="text-sm font-medium text-muted-foreground">
            Available Balance
          </p>
          <p className="text-4xl lg:text-5xl font-bold text-primary tracking-tighter">
            {formatCurrency(account.balance)}
          </p>
          {pendingShadowValue > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Total including pending: {formatCurrency(totalBalance)}
            </p>
          )}
        </div>
        
        {account.shadowEntries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                <Hourglass size={16}/>
                Pending & Failed Inflows (Shadow)
            </h3>
            <Separator className="mb-3"/>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {account.shadowEntries.map((entry) => (
                <div key={entry.id} className="flex justify-between items-center text-sm">
                  <div className='flex items-center gap-2'>
                    {entry.status === 'pending' && <Hourglass size={14} className="text-amber-500"/>}
                    {entry.status === 'failed' && <CircleX size={14} className="text-red-500"/>}
                    <p className="font-mono text-xs text-muted-foreground">{entry.txn_ref}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(entry.amount)}</span>
                    <StatusBadge status={entry.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
