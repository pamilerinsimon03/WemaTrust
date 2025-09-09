'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Transaction } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { StatusBadge } from './status-badge';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="text-primary" />
          <span>Transaction History</span>
        </CardTitle>
        <CardDescription>Your most recent transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {transactions.length > 0 ? (
            <div className="space-y-4 pr-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center">
                  <div className="flex-shrink-0">
                    {tx.type === 'credit' ? (
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                        <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-300" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                        <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-300" />
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-grow">
                    <p className="text-sm font-medium truncate">
                      {tx.note || (tx.type === 'credit' ? 'Inward Transfer' : `Transfer to ${tx.to_account}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                     <p
                      className={`text-sm font-semibold ${
                        tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>No transactions yet.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
