import { getAccount, getPartnerBanks, getTransactions } from '@/lib/store';
import { DashboardClient } from '@/components/dashboard-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function Home() {
  const account = getAccount('1');
  const partnerBanks = getPartnerBanks();
  const transactions = getTransactions();

  if (!account) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load critical account data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DashboardClient
      initialAccount={account}
      initialPartnerBanks={partnerBanks}
      initialTransactions={transactions}
    />
  );
}
