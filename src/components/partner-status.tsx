'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Satellite } from 'lucide-react';
import type { PartnerBank } from '@/lib/types';
import { StatusBadge } from './status-badge';

export function PartnerStatus({ partnerBanks }: { partnerBanks: PartnerBank[]}) {

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Satellite className="text-primary" />
          <span>Partner Bank Network</span>
        </CardTitle>
        <CardDescription>
          Live status of our partner banks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {partnerBanks.map(bank => (
            <div key={bank.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-secondary/30">
              <span className="font-medium">{bank.name}</span>
              <StatusBadge status={bank.status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
