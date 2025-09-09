'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccount, getPartnerBanks, getTransactions, getUser } from '@/lib/store';
import { DashboardClient } from '@/components/dashboard-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal } from 'lucide-react';
import type { Account, PartnerBank, Transaction, User } from '@/lib/types';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [partnerBanks, setPartnerBanks] = useState<PartnerBank[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      const currentUser = getUser(userId);
      if (!currentUser) {
        throw new Error('User not found. Please log in again.');
      }
      setUser(currentUser);

      if (currentUser.roles.includes('user') && currentUser.accountId) {
        const currentAccount = getAccount(currentUser.accountId);
        if (!currentAccount) {
          throw new Error('Associated account not found.');
        }
        setAccount(currentAccount);
      }

      setPartnerBanks(getPartnerBanks());
      setTransactions(getTransactions());
    } catch (e: any) {
      setError(e.message || 'An error occurred while loading data.');
      localStorage.removeItem('userId'); // Clear invalid user id
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-lg">Loading Dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Alert variant="destructive" className="max-w-md">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
     // This should be handled by the redirect, but as a fallback
    router.replace('/login');
    return null;
  }
  
  return (
    <DashboardLayout>
      <DashboardClient
        user={user}
        initialAccount={account}
        initialPartnerBanks={partnerBanks}
        initialTransactions={transactions}
      />
    </DashboardLayout>
  );
}
