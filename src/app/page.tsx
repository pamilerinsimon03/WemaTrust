'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

    const loadData = async () => {
      try {
        // Fetch user data from API
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) {
          throw new Error('User not found. Please log in again.');
        }
        const currentUser = await userResponse.json();
        setUser(currentUser);

        if (currentUser.accountId) {
          // Fetch account data from API
          const accountResponse = await fetch(`/api/accounts?userId=${userId}`);
          if (!accountResponse.ok) {
            throw new Error('Associated account not found.');
          }
          const currentAccount = await accountResponse.json();
          setAccount(currentAccount);
        }

        // Fetch partner banks from API
        const banksResponse = await fetch('/api/partner-banks');
        if (banksResponse.ok) {
          const banks = await banksResponse.json();
          setPartnerBanks(banks);
        }

        // Fetch transactions from API
        const transactionsResponse = await fetch(`/api/transactions?userId=${userId}`);
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          // Handle both array and object with transactions property
          const userTransactions = Array.isArray(transactionsData) 
            ? transactionsData 
            : transactionsData.transactions || [];
          setTransactions(userTransactions);
        }
      } catch (e: any) {
        setError(e.message || 'An error occurred while loading data.');
        localStorage.removeItem('userId'); // Clear invalid user id
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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
